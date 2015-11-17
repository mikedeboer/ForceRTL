# Force RTL

Force an LTR locale to behave as if it was an RTL locale.

At Mozilla we (read: frontend devs) all have this extension installed to help us develop & debug user interfaces in both reading directions. They need to look pixel perfect in both ways, at all times!

This repo started in November 2015 as a simple port from the original add-on, written by Ehsan Akhgari and Liu, with the following changes:
* Moved to Github to allow for an easier method to contribute,
* Ported the old code over to the latest addon-sdk and made it restartless,
* Fixed an issue so that things would not break half way when encountering an e10s document

...resulting in an add-on that requires Firefox or Thunderbird version 38 or higher.


### License
MPL.

### Contribute
I encourage everyone to contribute to this add-on whenever you see something you can improve! Please fork this project and open up a pull request.


### Links
* [https://developer.mozilla.org/en/Making_Sure_Your_Theme_Works_with_RTL_Locales](Making Sure Your Theme Works with RTL Locales)
* [http://ehsanakhgari.org/mozilla/extensions/firefox/force-rtl](Ehsan's Force RTL page)
