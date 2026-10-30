/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "d4f230f45004e134f30cd094ab6078c6"
  }, {
    "url": "pwa-512x512.png",
    "revision": "25b82dee68afbf98255af85110f86bee"
  }, {
    "url": "pwa-192x192.png",
    "revision": "fcd7192b10fb72c4e1c226f6a069a3b3"
  }, {
    "url": "index.html",
    "revision": "c4c5fbc58c12af91895672773f37c2df"
  }, {
    "url": "icon.svg",
    "revision": "b8b29c6b6e4fb9903aa6a04c9eec3cd4"
  }, {
    "url": "favicon.png",
    "revision": "4b31e62ed83ce2d881114059a04809c4"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2d0c96109d8537b2aa824a7f0a279a4b"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-DCH3Tvdd.css",
    "revision": null
  }, {
    "url": "assets/index-BrnvhAtt.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2d0c96109d8537b2aa824a7f0a279a4b"
  }, {
    "url": "favicon.png",
    "revision": "4b31e62ed83ce2d881114059a04809c4"
  }, {
    "url": "icon.svg",
    "revision": "b8b29c6b6e4fb9903aa6a04c9eec3cd4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "fcd7192b10fb72c4e1c226f6a069a3b3"
  }, {
    "url": "pwa-512x512.png",
    "revision": "25b82dee68afbf98255af85110f86bee"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "d4f230f45004e134f30cd094ab6078c6"
  }, {
    "url": "manifest.webmanifest",
    "revision": "e4f1c03c7f1db777dd27ea93ebb0c365"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
