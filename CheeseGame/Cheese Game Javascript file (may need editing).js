/* Sand Saga; Patrik Harag, https://harag.cz; all rights reserved */ ! function(n, r) {
    "object" == typeof exports && "undefined" != typeof module ? r(exports) : "function" == typeof define && define.amd ? define(["exports"], r) : r((n = "undefined" != typeof globalThis ? globalThis : n || self).SandSaga = {})
}(this, (function(n) {
    "use strict";
    class r {
        static #n = "/api/user/";
        static sendCompleted(n, t, e, o) {
            const a = new FormData;
            a.append("scenario", n);
            const d = r.#r(t);
            if (a.append("metadata", JSON.stringify(d)), !0 === o) {
                const n = r.#t(t);
                null !== n && a.append("data", n)
            }
            const s = fetch(r.#n + "scenario-completed", {
                method: "POST",
                body: a,
                headers: {
                    Accept: "application/json"
                }
            });
            void 0 !== e && s.then((n => n.json())).then((n => {
                "number" == typeof n.id && e(n.id)
            }))
        }
        static #e = 0;
        static #o = 3;
        static #a = 0;
        static #d = 3;
        static sendErrorReport(n, t, e, o, a) {
            if ("rendering-warning" === e) return;
            if ("user" === e) {
                if (!(r.#e < r.#o)) return;
                r.#e++
            } else {
                if (!(r.#a < r.#d)) return;
                r.#a++
            }
            const d = new FormData;
            d.append("scenario", n), d.append("location", e), d.append("message", o);
            const s = r.#r(t);
            if (d.append("metadata", JSON.stringify(s)), !0 === a) {
                const n = r.#t(t);
                null !== n && d.append("data", n)
            }
            fetch(r.#n + "report", {
                method: "POST",
                body: d
            })
        }
        static sendUpdate(n, t) {
            const e = new FormData;
            e.append("scenario", n), fetch(r.#n + "update", {
                method: "POST",
                body: e
            })
        }
        static #r(n) {
            const r = n.getSandGame();
            return {
                width: null !== r ? r.getWidth() : null,
                height: null !== r ? r.getHeight() : null,
                userAgent: navigator.userAgent
            }
        }
        static #t(n) {
            try {
                const r = n.createSnapshot();
                if (null === r) return null;
                const t = window.SandGameJS.Resources.createResourceFromSnapshot(r);
                return new Blob([t])
            } catch (n) {
                return console.warn(n), null
            }
        }
    }
    class t {
        static init(n, t, e) {
            let o = {};
            Object.assign(o, t), Object.assign(o, {
                disableSizeChange: !1,
                disableSceneSelection: !1
            }), Object.assign(o, e), o.errorReporter = (n, e, o) => {
                try {
                    r.sendErrorReport(t.scenario, o, n, e, !0)
                } catch (n) {}
            };
            const a = window.SandGameJS.init(n, o);
            let d = 0;
            const s = n => {
                    n.scenario().addOnStatusCompleted((() => {
                        if (void 0 !== t.onCompleted) try {
                            t.onCompleted()
                        } catch (n) {}
                        try {
                            r.sendCompleted(t.scenario, a, t.onAccepted, t.includeSnapshot)
                        } catch (n) {}
                    })), n.addOnProcessed((() => {
                        d++, 1e4 === d && n.scenario().setCompleted()
                    }))
                },
                c = a.getSandGame();
            return null !== c && s(c), a.addOnInitialized(s), setInterval((() => r.sendUpdate(t.scenario, a)), 6e4), a
        }
    }
    class e {
        static widthFraction(n, r) {
            return Math.trunc(n.getWidth() / r)
        }
        static heightFraction(n, r) {
            return Math.trunc(n.getHeight() / r)
        }
        static mapPositionFracWH(n, r, t, e) {
            let a, d;
            if (void 0 !== e)
                if (1 === e) {
                    const r = Math.min(n.getWidth(), n.getHeight());
                    a = r, d = r
                } else e > 1 ? (a = Math.min(n.getWidth(), n.getHeight() * e), d = a / e) : (d = Math.min(n.getHeight(), n.getWidth() / e), a = d * e);
            const s = void 0 === a ? n.getWidth() : Math.min(a, n.getWidth()),
                c = void 0 === d ? n.getHeight() : Math.min(d, n.getHeight()),
                l = void 0 === a ? 0 : Math.trunc((n.getWidth() - s) / 2),
                A = void 0 === d ? 0 : Math.trunc((n.getHeight() - c) / 2);
            return new o(l, A, s / r, c / t)
        }
    }
    class o {
        #s;
        #c;
        #l;
        #A;
        constructor(n, r, t, e) {
            this.#s = n, this.#c = r, this.#l = t, this.#A = e
        }
        x(n) {
            return Math.trunc(this.#s + n * this.#l)
        }
        y(n) {
            return Math.trunc(this.#c + n * this.#A)
        }
        w(n) {
            return Math.trunc(n * this.#l)
        }
        h(n) {
            return Math.trunc(n * this.#A)
        }
    }
    class a {
        static addContent(n, r) {
            if (null === r);
            else if ("string" == typeof r) n.textContent = r;
            else if (r instanceof Node) n.appendChild(r);
            else {
                if (!Array.isArray(r)) throw "Content type not supported: " + typeof r;
                for (const t of r)
                    if (t instanceof Node) n.appendChild(t);
                    else if ("string" == typeof t) n.insertAdjacentText("beforeend", t);
                else if (null !== t) throw "Content type not supported: " + typeof t
            }
        }
        static setContent(n, r) {
            n.innerHTML = "", a.addContent(n, r)
        }
        static putAttributes(n, r) {
            for (const t in r) {
                const e = r[t],
                    o = typeof e;
                if ("string" === o || "boolean" === o || "number" === o) n.setAttribute(t, e);
                else if ("style" === t && "object" === o) Object.assign(n.style, e);
                else if (null !== e) throw "Unsupported attribute type: " + typeof e
            }
        }
        static create(n) {
            const r = document.createElement("template");
            return r.innerHTML = n.trim(), r.content.firstElementChild
        }
        static element(n, r = null, t = null) {
            const e = document.createElement(n);
            return a.putAttributes(e, r), a.addContent(e, t), e
        }
        static div(n = null, r = null) {
            return a.element("div", n, r)
        }
        static par(n = null, r = null) {
            return a.element("p", n, r)
        }
        static span(n = null, r = null) {
            return a.element("span", r, n)
        }
    }
    const d = window.SandGameJS.BrushDefs,
        s = window.SandGameJS.Brushes,
        c = window.SandGameJS.ToolDefs,
        l = window.SandGameJS.Tools,
        A = window.SandGameJS.PredicateDefs;
    n.init = function(n, r) {
        function o(n, r, t, e, o) {
            let a = s.colorRandomize(10, s.colorPaletteCyclic(r, 1e3, d.SAND));
            return l.roundBrushTool(a, c.DEFAULT_SIZE, c.SAND.getInfo().derive({
                codeName: n,
                badgeStyle: {
                    backgroundColor: `rgb(${t},${e},${o})`
                }
            }))
        }
        const i = o("sand_1", "220,158,111\r\n220,158,111\r\n197,136,88\r\n197,136,88\r\n125,63,23\r\n120,57,16\r\n127,64,22\r\n143,78,31\r\n165,97,45\r\n163,93,39\r\n133,64,13\r\n133,65,14\r\n146,79,26\r\n139,73,22\r\n137,73,21\r\n128,65,15\r\n138,76,25\r\n137,77,26\r\n134,75,26\r\n159,100,52\r\n150,92,46\r\n127,70,26\r\n143,87,42\r\n142,87,44\r\n166,113,72\r\n170,117,77\r\n135,81,41\r\n137,82,41\r\n136,81,38\r\n100,43,6\r\n116,56,14\r\n158,96,50\r\n153,90,43\r\n139,74,27\r\n155,88,39\r\n179,111,60\r\n186,117,64\r\n198,128,75\r\n203,133,79\r\n185,117,65\r\n178,113,66\r\n171,109,64\r\n180,119,74\r\n168,110,65\r\n164,107,64\r\n163,110,68\r\n145,95,54\r\n144,96,58\r\n139,95,59\r\n144,102,69\r\n111,72,41\r\n110,73,45\r\n92,58,32\r\n70,37,14\r\n99,68,46\r\n104,71,47\r\n143,105,75\r\n191,148,114\r\n201,155,121\r\n218,169,134\r\n208,154,118\r\n173,115,78\r\n120,56,19\r\n126,59,20\r\n140,70,28\r\n148,75,31\r\n190,116,67\r\n190,116,65\r\n179,106,52\r\n193,120,64\r\n194,121,64\r\n201,131,72\r\n213,148,90\r\n198,135,78\r\n220,157,101\r\n238,175,122\r\n223,159,109\r\n225,161,113\r\n235,172,126\r\n222,159,115\r\n223,161,118\r\n216,154,112\r\n209,147,105\r\n195,134,91\r\n217,157,113\r\n240,181,136\r\n227,168,122\r\n229,168,121\r\n222,156,107\r\n185,116,68\r\n168,101,52\r\n155,91,42\r\n207,144,94\r\n225,164,115\r\n218,159,109\r\n212,154,104\r\n216,158,109\r\n221,163,115\r\n210,152,105\r\n201,142,95\r\n205,144,98\r\n204,143,98\r\n198,135,91\r\n200,137,94\r\n213,151,110\r\n214,153,112\r\n211,151,110\r\n203,144,103\r\n200,142,102\r\n202,146,106\r\n199,145,105\r\n193,141,101\r\n179,128,89\r\n175,126,87\r\n175,128,89\r\n183,138,99\r\n196,152,114\r\n201,158,120\r\n187,144,106\r\n164,123,85\r\n178,139,103\r\n186,147,111\r\n183,143,106\r\n165,122,86\r\n167,123,87\r\n202,155,120\r\n211,162,128\r\n183,133,99\r\n224,172,138\r\n214,162,128\r\n199,147,113\r\n194,142,107\r\n205,155,119\r\n222,172,135\r\n226,177,140\r\n223,173,135\r\n234,181,140\r\n233,178,136\r\n234,179,137\r\n237,181,139\r\n233,177,135\r\n228,170,128\r\n230,173,130\r\n238,180,137\r\n221,162,118\r\n222,162,118\r\n224,164,120\r\n228,167,122\r\n229,167,122\r\n229,166,121\r\n224,161,116\r\n192,132,82\r\n199,139,89\r\n191,131,81\r\n215,154,106\r\n208,147,99\r\n210,149,101\r\n206,144,97\r\n218,155,109\r\n204,140,94", 0, 0, 0),
            u = o("sand_2", "198,135,78\r\n220,157,101\r\n238,175,122\r\n223,159,109\r\n225,161,113\r\n235,172,126\r\n222,159,115\r\n223,161,118\r\n216,154,112\r\n209,147,105\r\n195,134,91\r\n217,157,113\r\n240,181,136\r\n227,168,122\r\n229,168,121\r\n222,156,107\r\n225,164,115\r\n218,159,109\r\n212,154,104\r\n216,158,109\r\n221,163,115\r\n210,152,105\r\n201,142,95\r\n205,144,98\r\n204,143,98\r\n198,135,91\r\n200,137,94\r\n213,151,110\r\n214,153,112\r\n211,151,110\r\n203,144,103\r\n200,142,102\r\n202,146,106\r\n199,145,105\r\n193,141,101\r\n179,128,89\r\n175,126,87\r\n175,128,89\r\n183,138,99\r\n196,152,114\r\n199,147,113\r\n194,142,107\r\n205,155,119\r\n222,172,135\r\n226,177,140\r\n223,173,135\r\n234,181,140\r\n233,178,136\r\n234,179,137\r\n237,181,139\r\n233,177,135\r\n228,170,128\r\n230,173,130\r\n238,180,137\r\n221,162,118\r\n222,162,118\r\n224,164,120\r\n228,167,122\r\n229,167,122\r\n229,166,121\r\n224,161,116\r\n220,158,111\r\n197,136,88\r\n192,132,82\r\n199,139,89\r\n191,131,81\r\n197,136,88\r\n215,154,106\r\n208,147,99\r\n210,149,101\r\n206,144,97\r\n220,158,111\r\n218,155,109\r\n204,140,94", 225, 161, 113),
            h = o("sand_3", "189,120,66\r\n190,117,60\r\n198,124,64\r\n188,114,55\r\n179,105,47\r\n185,111,53\r\n187,113,56\r\n183,109,52\r\n184,110,53\r\n177,103,47\r\n182,108,52\r\n190,116,60\r\n200,125,70\r\n209,134,79\r\n218,143,88\r\n223,148,93\r\n223,152,98\r\n195,127,74\r\n186,115,58\r\n191,119,59\r\n184,112,53\r\n179,107,48\r\n184,111,54\r\n181,108,51\r\n178,105,48\r\n187,113,56\r\n182,108,52\r\n183,109,53\r\n186,110,55\r\n191,115,60\r\n196,120,65\r\n202,126,70\r\n207,131,75\r\n208,134,80\r\n182,115,63\r\n186,117,61\r\n190,119,61\r\n186,115,57\r\n187,116,58\r\n189,117,60\r\n180,107,51\r\n178,105,49\r\n194,121,64\r\n177,103,47\r\n177,103,48\r\n179,103,48\r\n182,106,51\r\n188,112,57\r\n195,119,64\r\n202,126,70\r\n205,130,74\r\n190,126,74\r\n186,118,63\r\n187,118,61\r\n187,118,61\r\n193,123,66\r\n193,123,66\r\n176,105,49\r\n172,101,45\r\n192,120,64\r\n178,105,50\r\n179,105,50\r\n180,105,51\r\n183,107,53\r\n187,111,56\r\n193,117,62\r\n198,122,67\r\n201,125,68\r\n198,135,84\r\n183,117,63\r\n185,117,62\r\n185,117,62\r\n190,122,67\r\n190,121,66\r\n171,101,47\r\n165,95,40\r\n184,112,57\r\n185,113,58\r\n186,113,58\r\n186,112,57\r\n185,110,56\r\n184,109,55\r\n182,107,53\r\n182,106,52\r\n182,105,48\r\n193,131,81\r\n191,126,73\r\n194,128,73\r\n190,124,69\r\n190,123,69\r\n191,123,69\r\n180,111,57\r\n176,106,52\r\n190,120,65\r\n181,109,55\r\n181,109,55\r\n182,109,55\r\n182,108,54\r\n180,106,52\r\n177,103,49\r\n175,99,45\r\n176,98,40", 185, 111, 53),
            E = o("sand_4", "125,63,23\r\n120,57,16\r\n127,64,22\r\n143,78,31\r\n165,97,45\r\n163,93,39\r\n133,64,13\r\n133,65,14\r\n146,79,26\r\n139,73,22\r\n137,73,21\r\n128,65,15\r\n138,76,25\r\n137,77,26\r\n134,75,26\r\n159,100,52\r\n150,92,46\r\n127,70,26\r\n143,87,42\r\n142,87,44\r\n137,82,41\r\n136,81,38\r\n100,43,6\r\n116,56,14\r\n158,96,50\r\n153,90,43\r\n139,74,27\r\n155,88,39\r\n145,95,54\r\n144,96,58\r\n139,95,59\r\n144,102,69", 125, 63, 23),
            p = o("sand_5", "157,114,79\r\n154,111,76\r\n148,105,70\r\n151,108,73\r\n138,95,60\r\n128,85,50\r\n143,100,65\r\n146,103,68\r\n135,92,57\r\n125,81,46\r\n128,84,49\r\n135,92,57\r\n130,87,52\r\n119,75,40\r\n113,69,34\r\n125,80,45\r\n133,87,52\r\n132,86,51\r\n122,75,40\r\n114,67,33\r\n114,67,33\r\n106,60,25\r\n94,48,14\r\n152,109,74\r\n147,104,69\r\n143,100,65\r\n143,100,65\r\n136,93,58\r\n136,93,58\r\n147,104,69\r\n147,104,69\r\n146,103,68\r\n142,99,64\r\n145,102,67\r\n144,101,66\r\n122,78,44\r\n109,65,31\r\n121,77,42\r\n126,79,44\r\n137,90,54\r\n136,89,53\r\n122,74,39\r\n114,66,31\r\n116,68,33\r\n111,63,28\r\n99,51,17\r\n138,94,59\r\n140,96,61\r\n145,101,66\r\n140,96,61\r\n138,94,59\r\n143,99,64\r\n143,99,64\r\n137,93,58\r\n150,106,71\r\n147,103,68\r\n142,98,63\r\n142,98,63\r\n125,81,46\r\n114,70,36\r\n129,83,49\r\n131,83,47\r\n134,85,49\r\n134,85,49\r\n130,81,45\r\n125,76,40\r\n123,74,38\r\n123,74,38\r\n124,75,39\r\n128,82,48\r\n140,94,60\r\n155,109,75\r\n147,101,67\r\n146,100,66\r\n149,103,69\r\n138,92,58\r\n127,81,47\r\n145,99,65\r\n135,89,55\r\n124,78,44\r\n137,91,57\r\n138,92,58\r\n126,80,46\r\n130,83,48\r\n140,91,55\r\n131,80,44\r\n129,78,42\r\n135,84,48\r\n129,78,42\r\n116,65,30\r\n118,67,31\r\n131,80,44", 157, 114, 79),
            P = o("sand_6", "144,122,95\r\n157,135,108\r\n153,131,104\r\n135,113,88\r\n171,150,129\r\n142,121,102\r\n138,117,98\r\n148,127,108\r\n148,127,108\r\n155,133,115\r\n154,132,114\r\n132,111,92\r\n126,105,86\r\n157,135,117\r\n126,105,86\r\n152,130,112\r\n150,128,110\r\n122,101,82\r\n162,140,122\r\n143,123,103\r\n133,115,92\r\n122,106,81\r\n126,111,87\r\n154,140,117\r\n126,113,92\r\n160,147,127\r\n125,112,93\r\n129,116,97\r\n167,154,135\r\n145,129,111\r\n146,129,110\r\n145,125,106\r\n143,122,101\r\n135,112,91\r\n118,94,72\r\n127,104,83\r\n136,118,97\r\n163,147,126\r\n140,123,102\r\n146,128,106\r\n157,138,115\r\n152,131,108\r\n177,155,130\r\n179,156,130\r\n167,142,116\r\n158,132,105\r\n166,137,110\r\n136,118,93\r\n142,124,99\r\n166,148,123\r\n183,165,141\r\n156,136,116\r\n139,118,99\r\n147,126,107\r\n165,144,125\r\n151,130,111\r\n125,104,85\r\n125,104,85\r\n139,118,99\r\n132,111,92\r\n114,93,74\r\n150,129,110\r\n158,137,118\r\n138,117,98\r\n144,123,104\r\n156,135,116\r\n172,152,131\r\n144,126,102\r\n138,122,96\r\n137,122,97\r\n163,148,124\r\n122,108,86\r\n131,117,96\r\n131,117,97\r\n133,117,98\r\n164,148,129\r\n142,123,105\r\n153,132,113\r\n165,142,123\r\n168,143,122\r\n159,132,111\r\n147,119,97\r\n165,138,118\r\n181,159,142\r\n150,131,115\r\n155,136,120\r\n136,116,99\r\n136,116,98\r\n157,135,117\r\n144,121,101\r\n157,133,112\r\n165,140,118\r\n167,140,117\r\n168,140,116\r\n132,118,95\r\n130,116,93\r\n130,116,93\r\n135,119,96\r\n115,94,73\r\n125,102,82\r\n142,119,99\r\n162,139,119\r\n165,142,122\r\n151,128,108\r\n159,136,116\r\n190,167,147\r\n148,125,105\r\n124,101,81\r\n178,155,135\r\n189,166,146\r\n173,150,130\r\n172,149,129\r\n158,135,115\r\n193,172,150\r\n159,140,113\r\n152,135,106\r\n139,123,95\r\n170,154,127\r\n144,128,103\r\n138,121,98\r\n178,161,139\r\n171,153,132\r\n151,131,111\r\n142,119,99\r\n157,131,111\r\n159,131,110\r\n152,122,100\r\n146,114,91\r\n139,105,82\r\n157,126,106\r\n194,169,155\r\n149,126,115\r\n169,146,135\r\n160,136,124\r\n140,116,103\r\n151,127,112\r\n142,117,101\r\n145,119,102\r\n146,119,101\r\n146,117,98\r\n144,114,93", 144, 122, 95),
            q = o("sand_7", "255,22,0\r\n255,108,0\r\n255,151,0\r\n255,182,0\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n", 255,0,0),
            Q = o("sand_8", "255,27,0\r\n255,68,0\r\n255,109,0\r\n255,130,0\r\n255,151,0\r\n255,166,0\r\n255,181,0\r\n255,196,0\r\n255,211,0\r\n241,225,0\r\n225,238,0\r\n205,246,0\r\n184,253,0\r\n158,255,0\r\n132,255,1\r\n95,255,27\r\n53,255,65\r\n26,255,98\r\n8,255,127\r\n0,255,153\r\n0,254,176\r\n0,251,200\r\n0,245,224\r\n0,228,241\r\n0,198,250\r\n0,165,255\r\n0,125,255\r\n0,87,255\r\n0,53,255\r\n11,25,255\r\n58,14,255\r\n105,5,255\r\n151,2,255\r\n194,0,255\r\n209,0,255\r\n223,0,254\r\n234,0,229\r\n244,0,205\r\n249,0,178\r\n255,0,152", 255,255,0),

            S = s.colorRandomize(3, s.color(156, 184, 212, d.WATER)),
            V = s.colorRandomize(10, s.color(156, 184, 0, d.WATER)),
            v = s.colorRandomize(10, s.color(253, 218, 13, d.WATER)),
            H = l.roundBrushTool(S, c.DEFAULT_SIZE, c.WATER.getInfo().derive({
                codeName: "water_1",
                badgeStyle: {
                    backgroundColor: "rgb(121, 138, 155)"
                }
            })),
            J = l.roundBrushTool(V, c.DEFAULT_SIZE, c.WATER.getInfo().derive({
                codeName: "water_2",
                badgeStyle: {
                    backgroundColor: "rgb(121, 138, 0)"
                }
            })),
            Y = l.roundBrushTool(v, c.DEFAULT_SIZE, c.WATER.getInfo().derive({
                codeName: "water_2",
                badgeStyle: {
                    backgroundColor: "rgb(253, 218, 13)"
                }
            })),
            j = {
                tools: [c.ERASE, c.MOVE, c.FLIP_VERTICALLY, c.ENABLE_FALLTHROUGH, u, h, E, p, P, H,q,Q, J,Y, c.WALL, c.SAND,c.ERASE_SLASH,c.FIRE_SLASH, c.WATER,  c.SOIL, c.GRAVEL, c.COAL, c.THERMITE,  c.ROCK_TEMPLATES, c.TEMPLATES, c.ROCK,c.TAR, c.WOOD,c.WOOD_1,c.LEAF,c.LEAF_1, c.METAL, c.METAL_MOLTEN, c.FIRE, c.METEOR],
                scene: {
                    init: function(n, r) {
                        function t() {
                            return Math.trunc(1024 * Math.random())
                        }
                        n.layeredTemplate().layer(10, !1, d.AIR).layer(10, !1, d.WALL).layerPerlin([{
                            factor: 120,
                            threshold: 0,
                            force: 80,
                            seed: t()
                        }, {
                            factor: 30,
                            threshold: 0,
                            force: 10,
                            seed: t()
                        }, {
                            factor: 5,
                            threshold: 0,
                            force: 2,
                            seed: t()
                        }], !0, d.WALL), n.graphics().fill(s.conditional(A.IS_STATIC, i.getBrush()));
                        const o = e.mapPositionFracWH(n, 100, 100);
                        n.graphics().drawRectangle(o.x(30), o.y(40), o.x(70), o.y(50), u.getBrush());
                   
                    }
                },
                primaryTool: h
            };
        return t.init(n, r, j)
    }, Object.defineProperty(n, "__esModule", {
        value: !1
    })
}));