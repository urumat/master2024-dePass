"use strict";
!(function () {
  try {
    var e =
        "undefined" != typeof window
          ? window
          : "undefined" != typeof global
          ? global
          : "undefined" != typeof self
          ? self
          : {},
      n = new Error().stack;
    n &&
      ((e._sentryDebugIds = e._sentryDebugIds || {}),
      (e._sentryDebugIds[n] = "322b05fd-1204-5da1-8025-db441f595318"));
  } catch (e) {}
})();

(() => {
  var g = "injectJsHasStarted",
    n = "InjectManager:",
    f = async (e, t, r) => {
      if (g in e) {
        `${n}`;
        return;
      }
      Object.defineProperty(e, g, { value: !0, writable: !1 }),
        `${n}`,
        await w(e.document, t, r),
        `${n}`;
    },
    w = (e, t, r) => {
      if (e.compatMode !== "BackCompat" && e.doctype?.name !== "html") {
        `${n}`;
        return;
      }
      let o = y(),
        c = t.map((s) => ({ ...s, path: o + s.path })),
        i = r.map((s) => ({ ...s, path: o + s.path })),
        a = [];
      return (
        e.readyState === "loading"
          ? ((a = c.filter(p).map(l)),
            i.filter(p).forEach((s) => {
              let u = b();
              e.addEventListener(
                "DOMContentLoaded",
                () => {
                  l(s).then(u.resolve);
                },
                { once: !0 }
              ),
                (a = [...a, u.promise]);
            }))
          : (`${n}`, (a = [...c, ...i].filter(p).map(l))),
        Promise.all(a)
      );
    },
    y = () => {
      let e = chrome.runtime.getURL(""),
        t = new URL(e),
        r = t.protocol,
        o = t.host;
      return `${r}//${o}`;
    },
    m = (e, t) => {
      chrome.runtime.sendMessage({
        name: "report-error",
        data: {
          name: "InjectContentScript",
          message: e,
          severity: "error",
          stack: t,
        },
      });
    },
    S = (e, t) => {
      if (!h(e)) {
        console.error(t), m(t);
        return;
      }
      let r = `${t}, ${e.message}`;
      console.error(r), m(r, e.stack);
    },
    l = async (e) => {
      if ((`${n}${e.label}`, e.world === "ISOLATED"))
        try {
          await C(e.path);
        } catch (t) {
          return S(t, `Failed to fetch ${e.path}`), Promise.resolve(void 0);
        }
      else {
        let t = "Only isolated script injection has been supported";
        throw (m(t), new Error(t));
      }
    },
    C = async (e) => {
      let t = [];
      try {
        await T(e);
        return;
      } catch (i) {
        t.push(i);
      }
      await d(25);
      try {
        await import(e);
        return;
      } catch (i) {
        t.push(i);
      }
      await d(50);
      try {
        await import(e);
        return;
      } catch (i) {
        t.push(i);
      }
      if (t.length === 0)
        throw new Error("Logic error: unreachable code was executed");
      let r = t.length,
        o = t[r - 1],
        c = h(o) ? o.message : "thrown error has no message";
      throw new Error(`Import failed ${r} times. Final error: ${c}`);
    },
    T = (e) => import(e),
    p = (e) =>
      typeof e != "object" || e === null
        ? (`${n}`, !1)
        : !("path" in e) || typeof e.path != "string"
        ? (`${n}`, !1)
        : !("world" in e) || e.world !== "ISOLATED"
        ? (`${n}`, !1)
        : !0;
  function b() {
    let e,
      t = new Promise((o) => {
        e = o;
      });
    return { resolve: (o) => e(o), promise: t };
  }
  function d(e) {
    return new Promise((t) => {
      e && setTimeout(() => t({ type: "timeout" }), e);
    });
  }
  function h(e) {
    return !(typeof e != "object" || e === null || !("message" in e));
  }
  var j = [],
    $ = [
      {
        label: "Page Managers",
        path: "/injected/content.js",
        world: "ISOLATED",
      },
      {
        label: "CSS",
        path: "/injected/styles/inline-tooltip.css",
        world: "ISOLATED",
      }
    ];
  f(window, j, $);
})();
