window.__ModuleLoader__.load({ id: "dsh-convnav", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";

// dsh-convnav client —— 左侧对话节点导航条
// 会话聊天区左侧垂直节点串:每个 user 消息一个节点,点击平滑跳转到对应消息
// 数据:useSession 订阅 s.chat(order / nodes),kind === "user" 为节点
// 跳转:DOM [data-chat-flow-key] + scrollIntoView(官方 trajectory 同款做法)
// 样式:全部使用 dsh 官方 CSS 变量
var React = require("react");

var CSS = ".cn-rail{position:fixed;width:24px;z-index:900;pointer-events:none;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:4px 0;transform:translateY(-50%)}\n" +
  ".cn-bar{position:relative;pointer-events:auto;width:14px;height:2px;padding:5px 0;margin:-5px 0;background-color:color-mix(in srgb,var(--dsw-alias-label-tertiary) 55%,transparent);background-clip:content-box;cursor:pointer;transition:background-color .15s ease,width .18s ease}\n" +
  ".cn-bar:hover{background-color:var(--dsw-alias-brand-primary)}\n" +
  ".cn-bar.cur{background-color:var(--dsw-alias-brand-primary)}\n" +
  ".cn-tip{position:fixed;z-index:950;width:max-content;max-width:50vw;padding:3px 7px;border-radius:8px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;animation:cn-tip-in .15s var(--ds-ease-in-out,ease-in-out)}\n" +
  "@keyframes cn-tip-in{from{opacity:0}to{opacity:1}}\n";

if (typeof document !== "undefined") {
  if (!document.getElementById("cn-css")) {
    var st = document.createElement("style");
    st.id = "cn-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
}

function escAttr(s) {
  if (typeof CSS !== "undefined" && CSS.escape) { try { return CSS.escape(s); } catch (e) {} }
  return String(s).replace(/["\\]/g, "\\$&");
}

// 从消息内容块提取纯文本摘要(节点 tooltip)
function nodePreview(content) {
  if (!Array.isArray(content)) return "";
  var parts = [];
  for (var i = 0; i < content.length; i++) {
    var b = content[i];
    if (!b) continue;
    var t = typeof b.text === "string" ? b.text : (typeof b.content === "string" ? b.content : "");
    if (t) parts.push(t);
  }
  var s = parts.join(" ").replace(/\s+/g, " ").trim();
  return s.length > 48 ? s.slice(0, 48) + "…" : s;
}

function NodeNav(props) {
  var useSession = props.useSession;
  var sessionId = props.sessionId;
  var order = useSession(function (s) { return s && s.chat ? s.chat.order : null; });
  var nodeStore = useSession(function (s) { return s && s.chat ? s.chat.nodes : null; });

  var st0 = React.useState(null);
  var box = st0[0], setBox = st0[1]; // 导航条几何 {left,top}
  var st1 = React.useState(null);
  var currentKey = st1[0], setCurrentKey = st1[1]; // 视口顶部的 user 节点
  var st2 = React.useState(null);
  var tip = st2[0], setTip = st2[1]; // tooltip {x,y,label}
  var st3 = React.useState(null);
  var hoverIdx = st3[0], setHoverIdx = st3[1]; // 悬停中的节点下标(悬停时激活态跟随悬停)

  var containerRef = React.useRef(null);
  var itemsRef = React.useRef([]);
  var tickRef = React.useRef(false);

  // 节点列表:order 中可见的 user 消息(快照引用稳定,useMemo 只在变化时重建)
  var items = React.useMemo(function () {
    var out = [];
    if (order && nodeStore) {
      for (var i = 0; i < order.length; i++) {
        var k = order[i];
        var n = nodeStore.get(k);
        if (n && n.kind === "user") out.push({ key: k, label: nodePreview(n.data && n.data.content) || "用户消息" });
      }
    }
    return out;
  }, [order, nodeStore]);
  itemsRef.current = items;

  // 几何:跟随 [data-conversation-scroll] 滚动容器;resize/观察器/轮询兜底(视图切换、侧栏折叠)
  React.useEffect(function () {
    if (!items.length) return;
    function layout() {
      var c = containerRef.current;
      if (!c) return;
      var r = c.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      setBox({ left: r.left + 8, top: r.top + r.height / 2 });
    }
    function probe() {
      var c = document.querySelector("[data-conversation-scroll]");
      if (c === containerRef.current) return;
      containerRef.current = c;
      if (c) layout(); else setBox(null);
    }
    probe();
    var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    var timer = setInterval(probe, 1200);
    window.addEventListener("resize", layout);
    return function () {
      if (ro) ro.disconnect();
      clearInterval(timer);
      window.removeEventListener("resize", layout);
    };
  }, [items.length, sessionId]);

  // 当前节点:滚动时找视口顶部附近的 user 节点(rAF 节流,从最新往旧找)
  React.useEffect(function () {
    if (!items.length) return;
    function compute() {
      tickRef.current = false;
      var c = containerRef.current;
      if (!c) return;
      var limit = c.getBoundingClientRect().top + 56;
      var list = itemsRef.current;
      var cur = null;
      for (var i = list.length - 1; i >= 0; i--) {
        var row = document.querySelector('[data-chat-flow-key="' + escAttr(list[i].key) + '"]');
        if (row && row.getBoundingClientRect().top <= limit) { cur = list[i].key; break; }
      }
      setCurrentKey(cur);
    }
    function onScroll() {
      if (tickRef.current) return;
      tickRef.current = true;
      requestAnimationFrame(compute);
    }
    compute();
    var c = containerRef.current;
    if (c) c.addEventListener("scroll", onScroll, { passive: true });
    return function () { if (c) c.removeEventListener("scroll", onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sessionId]);

  function jump(key) {
    var row = document.querySelector('[data-chat-flow-key="' + escAttr(key) + '"]');
    if (row) row.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showTip(i, e) {
    var r = e.currentTarget.getBoundingClientRect();
    var x = r.left + 24;
    var y = r.top - 6;
    if (x + 280 > window.innerWidth) x = r.left - 304;
    setTip({ x: Math.max(8, x), y: Math.max(8, y), label: items[i].label });
  }
  function hideTip() { setTip(null); }

  // 激活节点:悬停时跟随悬停项(其他点取消激活),移开后恢复当前节点
  var activeKey = hoverIdx !== null ? items[hoverIdx].key : currentKey;
  // 悬停波浪:悬停项最长(22px),上下各 3 根按距离递减变长(19/17/15px);未悬停时仅当前节点 16px
  function barWidth(i) {
    if (hoverIdx !== null) {
      var d = Math.abs(i - hoverIdx);
      if (d === 0) return 22;
      if (d === 1) return 19;
      if (d === 2) return 17;
      if (d === 3) return 15;
      return 14;
    }
    return items[i].key === currentKey ? 16 : 14;
  }

  if (!items.length || !box) return null;

  return React.createElement(React.Fragment, null,
    React.createElement("div", { className: "cn-rail", style: { left: box.left, top: box.top } },
      items.map(function (it, i) {
        return React.createElement("div", {
          key: it.key,
          className: "cn-bar" + (it.key === activeKey ? " cur" : ""),
          style: { width: barWidth(i) },
          onMouseEnter: function (e) { setHoverIdx(i); showTip(i, e); },
          onMouseLeave: function () { setHoverIdx(null); hideTip(); },
          onClick: function () { jump(it.key); }
        });
      })
    ),
    tip ? React.createElement("div", { className: "cn-tip", style: { left: tip.x, top: tip.y } }, tip.label) : null
  );
}

module.exports = {
  name: "dsh-convnav",
  inject: ["slots"],
  apply(ctx) {
    const slots = ctx.get("slots");
    if (slots === void 0) return;
    ctx.effect(() => slots.inject("conversation.session.header.actions", () => slots.register(
      { name: "conversation.session.header.actions", id: "convnav", order: 35 },
      (props) => React.createElement(NodeNav, props)
    )));
  }
};

return module.exports; } });
