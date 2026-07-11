<?php
/* Copyright (C) 2025 Ecuenta Development Team
 *
 * POS Products API
 * Returns products for POS with images, prices, stock
 */

if (!defined('NOREQUIREMENU')) define('NOREQUIREMENU', '1');
if (!defined('NOREQUIREHTML')) define('NOREQUIREHTML', '1');
if (!defined('NOREQUIREAJAX')) define('NOREQUIREAJAX', '1');
if (!defined('NOLOGIN')) define('NOLOGIN', '1'); // Allow unauthenticated access
if (!defined('NOCSRFCHECK')) define('NOCSRFCHECK', '1'); // Skip CSRF check for public API

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/api/auth_helper.php';
require_once DOL_DOCUMENT_ROOT.'/api/auth_middleware.php';
require_once DOL_DOCUMENT_ROOT.'/product/class/product.class.php';
require_once DOL_DOCUMENT_ROOT.'/categories/class/categorie.class.php';

// Set JSON header and CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Entity');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Authenticate using X-API-Key
    $auth = authenticate_bearer_token();
    $user = $auth['user'];
    $user_entity = $auth['entity'];
    
    // Validate mobile API access (checks: API_MOBILE_APP_ENABLED, device blocking, session)
    validate_mobile_api_access($user);
    
    // IMPORTANT: Set global entity for getEntity() to work
    $conf->entity = $user_entity;
    $user->entity = $user_entity;
    error_log("POS Products API: Set entity to $user_entity");
    
    // Get parameters
    $category_id = !empty($_GET['category']) ? (int)$_GET['category'] : 0;
    $search = !empty($_GET['search']) ? trim($_GET['search']) : '';
    $tosell = !empty($_GET['tosell']) ? (int)$_GET['tosell'] : 1; // Only products for sale
    
    // Get currency
    $currency_code = $conf->currency;
    $currency_symbol = $conf->currency;
    
    // Try to get symbol from currencies table
    $sql = "SELECT code, symbol FROM ".MAIN_DB_PREFIX."c_currencies WHERE code = '".$db->escape($conf->currency)."' LIMIT 1";
    $resql = $db->query($sql);
    if ($resql && $obj = $db->fetch_object($resql)) {
        $currency_symbol = $obj->symbol ? $obj->symbol : $obj->code;
    }
    
    // Get proper entity list using Ecuenta's getEntity() function
    $entity_list = getEntity('product');
    error_log("POS Products API: Using entity list: " . $entity_list);
    
    // Build SQL query
    $sql = "SELECT DISTINCT p.rowid, p.ref, p.label, p.description, p.price, p.price_ttc,
            p.tva_tx, p.default_vat_code, p.stock, p.fk_product_type, p.barcode, p.entity,
            p.tosell, p.tobuy, p.finished";
    $sql .= " FROM ".MAIN_DB_PREFIX."product as p";
    
    // Join with category if filtering
    if ($category_id > 0) {
        $sql .= " LEFT JOIN ".MAIN_DB_PREFIX."categorie_product as cp ON p.rowid = cp.fk_product";
    }
    
    $sql .= " WHERE p.entity IN (".$entity_list.")";
    $sql .= " AND p.tosell = ".(int)$tosell;
    
    // Filter by category
    if ($category_id > 0) {
        $sql .= " AND cp.fk_categorie = ".(int)$category_id;
    }
    
    // Search filter
    if (!empty($search)) {
        $search_escaped = $db->escape($search);
        $sql .= " AND (p.ref LIKE '%".$search_escaped."%'";
        $sql .= " OR p.label LIKE '%".$search_escaped."%'";
        $sql .= " OR p.barcode LIKE '%".$search_escaped."%')";
    }
    
    $sql .= " ORDER BY p.label ASC";
    // $sql .= " LIMIT 100"; // Limit for performance
    
    $resql = $db->query($sql);
    
    if (!$resql) {
        throw new Exception($db->lasterror());
    }
    
    $products = [];
    $products_with_categories = 0;
    $products_without_categories = 0;
    
    while ($obj = $db->fetch_object($resql)) {
        // Load product object to get photo
        $product = new Product($db);
        $product->fetch($obj->rowid);
        
        // Get product photo using Ecuenta's standard method
        $photo_url = null;
        
        // Try to find image in product directory
        $productDir = get_exdir($product->id, 2, 0, 0, $product, 'product');
        $baseDir = $conf->product->multidir_output[$product->entity];
        
        // Check thumbs directory first (for performance)
        $thumbsDir = $baseDir . '/' . $productDir . '/thumbs/';
        if (is_dir($thumbsDir)) {
            $files = scandir($thumbsDir);
            foreach ($files as $file) {
                if ($file != '.' && $file != '..' && strpos($file, '_small.') !== false) {
                    $thumbPath = $productDir . '/thumbs/' . $file;
                    $photo_url = DOL_URL_ROOT . '/viewimage.php?modulepart=product&entity=' . $product->entity . '&file=' . urlencode($thumbPath) . '&cache=1&publictakepos=1';
                    break;
                }
            }
        }
        
        // If no thumbnail, check main product directory
        if (!$photo_url) {
            $productFullDir = $baseDir . '/' . $productDir;
            if (is_dir($productFullDir)) {
                $files = scandir($productFullDir);
                foreach ($files as $file) {
                    if ($file != '.' && $file != '..' && preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $file)) {
                        $imagePath = $productDir . '/' . $file;
                        $photo_url = DOL_URL_ROOT . '/viewimage.php?modulepart=product&entity=' . $product->entity . '&file=' . urlencode($imagePath) . '&cache=1&publictakepos=1';
                        break;
                    }
                }
            }
        }
        
        // Fallback to genimg for placeholder
        if (!$photo_url) {
            $photo_url = DOL_URL_ROOT . '/takeposnew/genimg/?query=pro&id=' . $product->id;
        }
        
        // Get category info
        $categories = [];
        $sql_cat = "SELECT c.rowid, c.label FROM ".MAIN_DB_PREFIX."categorie as c";
        $sql_cat .= " INNER JOIN ".MAIN_DB_PREFIX."categorie_product as cp ON c.rowid = cp.fk_categorie";
        $sql_cat .= " WHERE cp.fk_product = ".(int)$obj->rowid;
        $sql_cat .= " AND c.type = 0"; // Product categories
        $sql_cat .= " AND c.entity IN (".$entity_list.")"; // Filter by entity
        $resql_cat = $db->query($sql_cat);
        
        if ($resql_cat) {
            while ($obj_cat = $db->fetch_object($resql_cat)) {
                $categories[] = [
                    'id' => (int)$obj_cat->rowid,
                    'label' => $obj_cat->label
                ];
            }
            $db->free($resql_cat);
        } else {
            error_log("POS Products API: Category query failed for product {$obj->rowid}: " . $db->lasterror());
        }
        
        // Get VAT code from product object (more reliable than SQL query)
        $vat_code = '';
        if (!empty($product->default_vat_code)) {
            $vat_code = $product->default_vat_code;
        } elseif (!empty($obj->default_vat_code)) {
            $vat_code = $obj->default_vat_code;
        }

        // Get base unit label (e.g. kg, g, L, mL, piece) from Dolibarr's c_units dictionary
        $unit_label = null;
        $unit_code = null;
        if (!empty($product->fk_unit)) {
            $sql_unit = "SELECT label, code, short_label FROM ".MAIN_DB_PREFIX."c_units WHERE rowid = ".(int)$product->fk_unit;
            $resql_unit = $db->query($sql_unit);
            if ($resql_unit && $obj_unit = $db->fetch_object($resql_unit)) {
                $unit_label = $obj_unit->short_label ?: $obj_unit->label;
                $unit_code = $obj_unit->code;
            }
        }

        // Get packaging/UOM conversions (e.g. "1 Bag = 6 EA"), same source as the
        // legacy takeposnew UOM selector (llx_product_uom_conversion + llx_c_units)
        $has_uom = false;
        $uom_units = [];
        if (getDolGlobalString('STOCK_ENABLE_UOM')) {
            $sql_uom = "SELECT puc.rowid as id, puc.fk_unit_to as unit_id,
                               puc.conversion_factor as factor, puc.price_override_ttc,
                               puc.barcode as uom_barcode, cu.label, cu.code, cu.short_label
                        FROM ".MAIN_DB_PREFIX."product_uom_conversion as puc
                        LEFT JOIN ".MAIN_DB_PREFIX."c_units as cu ON cu.rowid = puc.fk_unit_to
                        WHERE puc.fk_product = ".(int)$obj->rowid;
            $sql_uom .= " AND puc.entity IN (0, ".(int)$user_entity.")";
            $sql_uom .= " ORDER BY puc.conversion_factor ASC";

            $resql_uom = $db->query($sql_uom);
            if ($resql_uom) {
                while ($obj_uom = $db->fetch_object($resql_uom)) {
                    $has_uom = true;
                    $uom_units[] = [
                        'id' => (int)$obj_uom->id,
                        'unit_id' => (int)$obj_uom->unit_id,
                        'label' => $obj_uom->label ?: 'Unit',
                        'code' => $obj_uom->code ?: 'UN',
                        'short_label' => $obj_uom->short_label ?: $obj_uom->label,
                        'factor' => (float)$obj_uom->factor,
                        'uom_barcode' => $obj_uom->uom_barcode ?: '',
                        'price_override_ttc' => (float)$obj_uom->price_override_ttc,
                    ];
                }
                $db->free($resql_uom);
            }
        }

        // Get primary category ID (first category in array, or null)
        $category_id = !empty($categories) ? $categories[0]['id'] : null;
        
        // Track category assignment statistics
        if (!empty($categories)) {
            $products_with_categories++;
        } else {
            $products_without_categories++;
        }
        
        $products[] = [
            'id' => (int)$obj->rowid,
            'ref' => $obj->ref,
            'label' => $obj->label,
            'description' => $obj->description ? strip_tags($obj->description) : '',
            'price' => (float)$obj->price,
            'price_ttc' => (float)$obj->price_ttc,
            'tva_tx' => (float)$obj->tva_tx,
            'tva_rate' => (float)$obj->tva_tx, // Alias for compatibility
            'vat_src_code' => $vat_code, // VAT code like 'A', 'B', 'C3'
            'default_vat_code' => $vat_code, // Alias
            'stock' => (int)$obj->stock,
            'product_type' => (int)$obj->fk_product_type, // 0 = product, 1 = service
            'barcode' => $obj->barcode,
            'photo' => $photo_url,
            'category_id' => $category_id, // Primary category ID for Flutter compatibility
            'categories' => $categories, // All categories array
            'available' => ((int)$obj->stock > 0 || (int)$obj->fk_product_type == 1), // Services always available
            'unit_label' => $unit_label, // Base unit, e.g. "kg", "L", "piece"
            'unit_code' => $unit_code,
            'has_uom' => $has_uom, // True if alternate packaging units exist (e.g. Bag = 6 EA)
            'uom_units' => $uom_units,
        ];
    }
    
    // Log category assignment statistics
    error_log("POS Products API: Total products: " . count($products) . ", With categories: $products_with_categories, Without categories: $products_without_categories");
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'products' => $products,
        'total_count' => count($products),
        'currency' => $currency_code,
        'currency_symbol' => $currency_symbol,
        'entity' => (int)$user_entity,
        'filters' => [
            'category' => $category_id,
            'search' => $search,
            'tosell' => $tosell
        ],
        'debug' => [
            'products_with_categories' => $products_with_categories,
            'products_without_categories' => $products_without_categories,
            'entity_list' => $entity_list
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>
