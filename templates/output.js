/*
 ** Author: `{{author}}`
 ** Company: Conversion
 ** Date: `{{date}}`
 */
 (function () {
	"use strict";

	if (typeof unsafeWindow !== "undefined") window = unsafeWindow;

	var tag = "`{{expPath}}`",
		debug = document.cookie.indexOf("cfQA") > -1;

	window[tag] = {
		log: function (msg) {
			if (debug) console.log("[CONV]", tag, "-->", msg);
		},

		waitForElement: function (cssSelector, callback) {
			var elementCached,
				maxCalls = 500,
        poller = function () {
					elementCached = document.querySelector(cssSelector);

					if (elementCached) {
						clearInterval(interval);

						try {
							callback(elementCached);
						} catch (err) {
							window[tag].log(err.message);
						}
					}

					if (--maxCalls < 0) {
						clearInterval(interval);
						window[tag].log(cssSelector + " not found");
					}
				},
				interval = setInterval(poller, 20);
        poller();
		},

		init: function () {
			try {
				this.waitForElement("body", function (docBody) {
					docBody.classList.add(tag);
				});

				if (debug && document.title.indexOf("CONV QA") < 0) {
					document.title = "[CONV QA] " + document.title;
				}

				initVariation();

				window[tag].log("test running");
			} catch (err) {
				window[tag].log(err.message);
			}
		},
	};

	window[tag].init();

	function initVariation() {
		`{{variationCode}}`
	}
})();