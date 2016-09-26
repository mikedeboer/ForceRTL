/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { Cc, Ci, components } = require("chrome");
const { id: kAppID } = require("sdk/system");
const { data: Data } = require("sdk/self");
const { Class } = require("sdk/core/heritage");
const { Disposable } = require("sdk/core/disposable");
const Prefs = require("sdk/simple-prefs");

const kAppIDFirefox = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const kAppIDThunderbird = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const kIsMozLocaleDirSupported = kAppID == kAppIDThunderbird || kAppID == kAppIDFirefox;
const kLocaleDirPrefPrefix = "intl.uidirection.";
let gLocaleDirPref = null;

let gToggleCallbacks = [];
let gObservingWindows = false;

const switchMode = dir => {
  if (haveAPISupport() &&
      switchStyleSheet(dir) &&
      changeChromeDir(dir)) {
    if (kIsMozLocaleDirSupported && gLocaleDirPref) {
      require("sdk/preferences/service").set(gLocaleDirPref, dir);
    }
  }
  invokeCallbacks();
};

const haveAPISupport = function() {
  return ("@mozilla.org/content/style-sheet-service;1" in Cc) &&
         (!components.ID("{41d979dc-ea03-4235-86ff-1e3c090c5630}").equals(Ci.nsIStyleSheetService));
};

const switchStyleSheet = function(dir) {
  let sss = Cc["@mozilla.org/content/style-sheet-service;1"]
              .getService(Ci.nsIStyleSheetService);
  let ios = Cc["@mozilla.org/network/io-service;1"]
              .getService(Ci.nsIIOService);
  let uri = ios.newURI(Data.url("./intl.css"), null, null);
  if (dir == "ltr") {
    if (sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
      sss.unregisterSheet(uri, sss.AGENT_SHEET);
      return !sss.sheetRegistered(uri, sss.AGENT_SHEET);
    }
  } else {
    if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
      sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
      return sss.sheetRegistered(uri, sss.AGENT_SHEET);
    }
  }
  return false;
};

const changeChromeDir = function(dir) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);
  let enumerator = wm.getEnumerator(null);
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    if (!gLocaleDirPref) {
      gLocaleDirPref = kLocaleDirPrefPrefix + win.navigator.language;
    }
    changeChromeDirInDoc(win.document, dir);
  }

  if (!gObservingWindows) {
    gObservingWindows = true;
    let ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
               .getService(Ci.nsIWindowWatcher);
    ww.registerNotification(windowWatcherObserver);
  }

  return true;
}

const windowWatcherObserver = function(aSubject, aTopic, aData) {
  if (aTopic == "domwindowopened") {
    try {
      var win = aSubject.QueryInterface(Components.interfaces.nsIDOMWindow);
      win.addEventListener("load", onNewWindowLoaded, false);
    } catch (e) {}
  }
};

const onNewWindowLoaded = function() {
  let win = event.target;
  changeChromeDirInDoc(win, exports.ForceRTL.dir);
  win.addEventListener("DOMContentLoaded", onNewDocumentLoaded, true);
};

const onNewDocumentLoaded = function() {
  changeChromeDirInDoc(event.originalTarget, exports.ForceRTL.dir);
};

const changeChromeDirInDoc = function(doc, dir) {
  if (!(doc instanceof Ci.nsIDOMXULDocument) &&
      !(doc instanceof Ci.nsIDOMHTMLDocument)) {
    try {
      doc = doc.QueryInterface(Ci.nsIDOMXULDocument);
    } catch(e) {
      try {
        doc = doc.QueryInterface(Ci.nsIDOMHTMLDocument);
      } catch (e) {}
    }
  }

  if (doc instanceof Ci.nsIDOMXULDocument ||
      doc instanceof Ci.nsIDOMHTMLDocument) {

    // Try to limit ourselves to UI-related documents
    if (!( doc.location.protocol == "chrome:" ||
           doc.location.protocol == "about:" ||
           doc.baseURI.substr(0, 15) == "about:neterror?" ||
           // XXXkliu:
           // We want to handle local file listings, as that's browser-generated
           // content, but not local files; it seems that checking for a
           // trailing slash in the baseURI is a good heuristic.
           doc.baseURI.search(/^file:.+\/$/) != -1 ||
           // XXXehsan:
           // This is kind of a hack.  Some FTP sites provide index pages, which we should not
           // touch.  Others do not, and Firefox displays its own dirListing page which we need
           // to detect.  I do this by checking for an element with ID "UI_goUp", because I was
           // not able to find a more elegant way.  :(
           (doc.baseURI.search(/^ftp:.+\/$/) != -1 && doc.getElementById("UI_goUp")) ))
    {
      return;
    }

    let walker;
    try {
      walker = Cc["@mozilla.org/inspector/deep-tree-walker;1"]
                 .createInstance(Ci.inIDeepTreeWalker);
    } catch(e) { return; }

    const SHOW_ELEMENT = Ci.nsIDOMNodeFilter.SHOW_ELEMENT;
    walker.showAnonymousContent = true;
    walker.showSubDocuments = false;
    try {
      walker.init(doc.documentElement, SHOW_ELEMENT);
    } catch (ex) {
      return;
    }

    if (true) {
      // XXXkliu:
      // Unfortuantely, some anonymous nodes will not show up unless they have
      // been "initialized" (either drawn or walked), which means that some
      // hidden anonymous content will not get updated unless we do this
      // dry-run walk through the tree
      while (walker.nextNode()) {
        // do nothing
      }
      walker = Cc["@mozilla.org/inspector/deep-tree-walker;1"]
                 .createInstance(Ci.inIDeepTreeWalker);
      walker.showAnonymousContent = true;
      walker.showSubDocuments = false;
      walker.init(doc.documentElement, SHOW_ELEMENT);
    }

    var node = walker.currentNode;
    do {
      if (node instanceof Ci.nsIDOMXULElement) {
        if (node.hasAttribute("chromedir")) {
          node.setAttribute("chromedir", dir);
        }

        // Walk sub-documents
        if (node.localName == "browser") {
          changeChromeDirInDoc(node.contentDocument, dir);
        }
      } else if (node instanceof Ci.nsIDOMHTMLElement) {
        if (node.hasAttribute("dir")) {
          node.setAttribute("dir", dir);
        }
      }
    } while (node = walker.nextNode());
  }
};

const onPrefChange = () => switchMode(exports.ForceRTL.enabled ? "rtl" : "ltr");

const invokeCallbacks = () => {
  for (let cb of gToggleCallbacks) {
    cb();
  }
  gToggleCallbacks = [];
};

exports.ForceRTL = Class({
  implements: [Disposable],
  initialize: function() {
    Prefs.on("rtl", onPrefChange);
    switchMode(this.dir);
  },
  get enabled() {
    return Prefs.prefs.rtl;
  },
  get dir() {
    return this.enabled ? "rtl" : "ltr"
  },
  toggle: function(callback) {
    gToggleCallbacks.push(callback);
    Prefs.prefs.rtl = !this.enabled;
  },
  dispose() {
    Prefs.removeListener("rtl", onPrefChange);
    if (gObservingWindows) {
      let ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                 .getService(Ci.nsIWindowWatcher);
      ww.unregisterNotification(windowWatcherObserver);
    }
  }
})();
