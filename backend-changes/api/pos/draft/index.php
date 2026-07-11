<?php
/* Copyright (C) 2025 Ecuenta Development Team
 *
 * POS Draft API - Save a cart as a TRUE Dolibarr draft invoice (statut=0),
 * without validating it. Mirrors takeposnew/ajax/waiter_ajax.php's
 * submitCartAsDraft, as a clean REST endpoint for the mobile/standalone app.
 * Unlike api/pos/payment's deferred_payment flag (which still validates the
 * invoice), this endpoint never calls validate() — stock is not decremented
 * and the ref stays a (PROVxxx) placeholder until the sale is actually paid
 * (see api/pos/payment's existing_invoice_id path, which already validates
 * correctly when settling an invoice still in draft status).
 */

if (!defined('NOREQUIREMENU')) define('NOREQUIREMENU', '1');
if (!defined('NOREQUIREHTML'))  define('NOREQUIREHTML',  '1');
if (!defined('NOREQUIREAJAX'))  define('NOREQUIREAJAX',  '1');
if (!defined('NOLOGIN'))        define('NOLOGIN',        '1');
if (!defined('NOCSRFCHECK'))    define('NOCSRFCHECK',    '1');

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/compta/facture/class/facture.class.php';
require_once DOL_DOCUMENT_ROOT.'/api/auth_helper.php';
require_once DOL_DOCUMENT_ROOT.'/api/auth_middleware.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Entity');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$auth        = authenticate_bearer_token();
$user        = $auth['user'];
$user_entity = $auth['entity'];

validate_mobile_api_access($user);

$conf->entity = $user_entity;
$user->entity = $user_entity;

if (!isset($user->rights->facture)) $user->rights->facture = new stdClass();
$user->rights->facture->lire  = 1;
$user->rights->facture->creer = 1;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

try {
    handleSaveDraft($db, $user, $user_entity, $input);
} catch (Exception $e) {
    dol_syslog("POS Draft API Error: " . $e->getMessage(), LOG_ERR);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error', 'message' => $e->getMessage()]);
}

/**
 * Save the current cart as a true Dolibarr draft invoice (statut=0) — never
 * validated, so stock isn't decremented and the ref stays a (PROVxxx)
 * placeholder. Finds an existing draft for this terminal/place by
 * ref_client and replaces its lines, or creates a new one.
 *
 * Required input fields:
 *   socid    int     Customer ID
 *   lines    array   Cart lines (JSON array or JSON string)
 *   terminal int     POS terminal number (default 1)
 *   place    int     POS place/table (default 0)
 *
 * Optional:
 *   discount_percent float
 *   note_private     string
 */
function handleSaveDraft($db, $user, $user_entity, $input) {
    global $conf;

    $socid            = isset($input['socid'])            ? (int)$input['socid']              : 0;
    $terminal         = isset($input['terminal'])         ? (int)$input['terminal']           : 1;
    $place            = isset($input['place'])            ? (int)$input['place']              : 0;
    $discount_percent = isset($input['discount_percent'])  ? (float)$input['discount_percent'] : 0;
    $note_private     = isset($input['note_private'])      ? $input['note_private']            : '';

    $lines = isset($input['lines']) ? $input['lines'] : [];
    if (is_string($lines)) $lines = json_decode($lines, true) ?: [];

    if ($socid <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'socid is required']);
        return;
    }
    if (empty($lines)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'lines is required']);
        return;
    }

    $db->begin();

    try {
        $ref_client = 'POS'.$terminal.'-'.$place;

        // Find an existing draft for this terminal/place (mirrors legacy's
        // submitCartAsDraft lookup by ref_client + STATUS_DRAFT).
        $sql_draft = "SELECT rowid FROM ".MAIN_DB_PREFIX."facture"
                   . " WHERE ref_client = '".$db->escape($ref_client)."'"
                   . " AND fk_statut = ".Facture::STATUS_DRAFT
                   . " AND entity = ".(int)$user_entity
                   . " ORDER BY rowid DESC LIMIT 1";
        $res_draft = $db->query($sql_draft);

        $invoice = new Facture($db);

        if ($res_draft && $db->num_rows($res_draft) > 0) {
            $obj_draft = $db->fetch_object($res_draft);
            $invoice->fetch($obj_draft->rowid);
            $invoice->fetch_lines();

            // Replace lines wholesale with the current cart — simpler than
            // legacy's line-by-line reconciliation, and equally correct
            // since the draft only ever needs to reflect the cart's current
            // state, not a diff-based history of it.
            foreach ($invoice->lines as $existing_line) {
                $invoice->deleteline($existing_line->id);
            }

            if ($socid > 0 && $invoice->socid != $socid) {
                $invoice->socid = $socid;
            }
            $invoice->update($user);

            dol_syslog("POS Draft: Reusing existing draft invoice ID {$invoice->id}", LOG_INFO);
        } else {
            $invoice->socid         = $socid;
            $invoice->date          = dol_now();
            $invoice->type          = Facture::TYPE_STANDARD;
            $invoice->entity        = $user_entity;
            $invoice->module_source = 'takepos';
            $invoice->pos_source    = $terminal;
            $invoice->ref_client    = $ref_client;
            $invoice->floorid       = $place;
            if (!empty($note_private)) $invoice->note_private = $note_private;

            $new_id = $invoice->create($user);
            if ($new_id <= 0) throw new Exception("Failed to create draft invoice: ".$invoice->error);
            dol_syslog("POS Draft: Created new draft invoice ID $new_id", LOG_INFO);
        }

        // Add cart lines — same shape/logic as api/pos/payment's line handling.
        foreach ($lines as $line) {
            $product_id    = isset($line['fk_product'])    ? (int)$line['fk_product']      : 0;
            $qty           = isset($line['qty'])            ? (float)$line['qty']           : 1;
            $price_ht      = isset($line['price'])          ? (float)$line['price']         : 0;
            $price_ttc     = isset($line['subprice'])       ? (float)$line['subprice']      : 0;
            $tva_tx        = isset($line['tva_tx'])         ? $line['tva_tx']               : '0';
            $vat_src_code  = isset($line['vat_src_code'])   ? trim($line['vat_src_code'])   : '';
            $desc          = isset($line['description'])    ? $line['description']          : (isset($line['desc']) ? $line['desc'] : '');
            $line_discount = isset($line['remise_percent']) ? (float)$line['remise_percent'] : 0;
            $product_type  = isset($line['product_type'])   ? (int)$line['product_type']    : 0;

            if (!empty($vat_src_code)) {
                $vat_numeric = price2num(preg_replace('/[^0-9.]/', '', $tva_tx));
                $tva_tx = $vat_numeric.' ('.$vat_src_code.')';
            }

            $use_precalc = isset($line['total_ht']) && isset($line['total_ttc']);
            $total_ht  = $use_precalc ? round((float)$line['total_ht'],  4) : 0;
            $total_ttc = $use_precalc ? round((float)$line['total_ttc'], 4) : 0;
            $total_tva = $use_precalc ? round($total_ttc - $total_ht, 4)   : 0;

            $result = $invoice->addline(
                $desc, $price_ht, $qty, $tva_tx,
                0, 0, $product_id, $line_discount,
                '', '', 0, 0, 0, 'HT', $price_ttc,
                $product_type, -1, 0, '', 0, 0, 0, 0, '',
                [], 100, 0, '', 0, ''
            );
            if ($result <= 0) throw new Exception("Failed to add line: ".$invoice->error);

            if ($use_precalc && $result > 0) {
                $invoice->fetch($invoice->id);
                $line_count = count($invoice->lines);
                if ($line_count > 0) {
                    $last = $invoice->lines[$line_count - 1];
                    $sql_upd = "UPDATE ".MAIN_DB_PREFIX."facturedet"
                             . " SET subprice = ".$price_ht
                             . ", total_ht = ".$total_ht
                             . ", total_tva = ".$total_tva
                             . ", total_ttc = ".$total_ttc
                             . ", multicurrency_subprice = ".$price_ht
                             . ", multicurrency_total_ht = ".$total_ht
                             . ", multicurrency_total_tva = ".$total_tva
                             . ", multicurrency_total_ttc = ".$total_ttc
                             . " WHERE rowid = ".(int)$last->id;
                    $db->query($sql_upd);
                }
            }
        }

        if ($discount_percent > 0 && $discount_percent <= 100) {
            $invoice->remise_percent = $discount_percent;
            $invoice->update($user);
        }

        $invoice->fetch($invoice->id); // Refresh totals after lines added

        $db->commit();

        http_response_code(200);
        echo json_encode([
            'success'       => true,
            'message'       => 'Draft saved (not validated — stock untouched)',
            'invoice_id'    => (int)$invoice->id,
            'invoice_ref'   => $invoice->ref, // stays "(PROVxxx)" — never validated
            'invoice_total' => (float)$invoice->total_ttc,
            'customer_id'   => $socid,
        ], JSON_PRETTY_PRINT);

    } catch (Exception $e) {
        $db->rollback();
        dol_syslog("POS Draft API: Transaction rolled back: ".$e->getMessage(), LOG_ERR);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
