/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { id: kAddonID, data: Data } = require("sdk/self");
const { id: kAppID } = require("sdk/system");
const { get: _ } = require("sdk/l10n");
const { Class } = require("sdk/core/heritage");
const { Disposable } = require("sdk/core/disposable");
const { ForceRTL } = require("./lib/forcertl");

const kAppIDFirefox = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const kAppIDThunderbird = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

let gMenuItem;

Class({
  implements: [Disposable],
  initialize: () => {
    gMenuItem = require("menuitem").Menuitem({
      id: "menuitem--" + kAddonID.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
      menuid: kAppID == kAppIDThunderbird ? "taskPopup" : "menu_ToolsPopup",
      insertbefore: kAppID == kAppIDThunderbird ? "menu_accountmgr" : "sanitizeSeparator",
      "label": _("label"),
      "accesskey": _("accesskey"),
      image: Data.url("icon.png"),
      disabled: false,
      checked: ForceRTL.enabled,
      onCommand: function() {
        ForceRTL.toggle(() => gMenuItem.checked = ForceRTL.enabled);
      }
    });
  },
  dispose: () => gMenuItem.destroy()
})();
