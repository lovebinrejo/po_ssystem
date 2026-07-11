# Backend changes (Dolibarr PHP)

`D:\React Project\htdocs` (and its live mirror `C:\wamp64\www\ecuenta9\htdocs`) is
**not** a git repository — it's the actual Dolibarr ERP installation this app
talks to, not something we own or fully version-control. This folder is a
tracked copy of the backend files this branch's frontend work depends on, kept
here for review/history purposes. It is not deployed from here — the real
deployment is a manual file copy into htdocs (see project notes).

## Files

- `api/pos/draft/index.php` — **new** endpoint. Saves a cart as a true
  Dolibarr draft invoice (`statut=0`, never validated — mirrors legacy's
  `takeposnew/ajax/waiter_ajax.php` `submitCartAsDraft`). Used by the
  standalone app's cart "Draft" button instead of the old `deferred_payment`
  flag on `api/pos/payment`, which validated the invoice immediately.

- `api/pos/products/index.php` — the live copy at `wamp64` was missing the
  entire UOM/packaging query block present here (has_uom/uom_units/unit_label/
  unit_code). This is the corrected version, already synced to the live
  server. Also requires the Dolibarr admin constant `STOCK_ENABLE_UOM=1` to be
  set (via Setup → Other Setup → CONST) for the UOM query to run at all.

## Not yet deployed to demo1.ecuenta.online

Both of the above are only live on local WAMP. `demo1.ecuenta.online` is a
separate, independently-hosted Dolibarr instance with no file access from
this environment — someone with FTP/hosting access to that server needs to
copy these same files there for the same fixes to apply.
