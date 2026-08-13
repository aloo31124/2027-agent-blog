/*
  後台預覽樣板（FR-022）。
  載入公開網站的樣式，讓預覽與正式頁面看起來一致，
  避免「預覽好看、發佈後跑掉」這種只有發佈後才發現的落差。
*/
(function () {
  if (typeof CMS === "undefined") return;

  CMS.registerPreviewStyle("/assets/styles.css");

  CMS.registerPreviewTemplate("posts", createClass(function (props) {
    var entry = props.entry;
    var data = entry.get("data");
    var title = data.get("title") || "（尚未輸入標題）";
    var description = data.get("description") || "";
    var date = data.get("date");
    var author = data.get("author");
    var readingTime = data.get("readingTime");
    var draft = data.get("draft");
    var tags = (data.get("tags") || []).toJS
      ? data.get("tags").toJS()
      : [];

    var userTags = tags.filter(function (t) { return t !== "post" && t !== "all"; });

    return h("article", { className: "post" },
      draft ? h("p", { className: "empty-state" },
        "這是草稿。發佈之前，公開網站上不會有這一頁。") : null,
      h("header", { className: "post-header" },
        h("h1", {}, title),
        h("p", { className: "post-meta" },
          date ? h("time", {}, formatDate(date)) : null,
          author ? h("span", {}, "作者：" + author) : null,
          readingTime ? h("span", {}, "閱讀約 " + readingTime + " 分鐘") : null
        ),
        userTags.length
          ? h("ul", { className: "tag-list" }, userTags.map(function (tag, i) {
              return h("li", { key: i }, h("a", { href: "#" }, tag));
            }))
          : null
      ),
      props.widgetFor("coverImage")
        ? h("div", { className: "post-cover" }, props.widgetFor("coverImage"))
        : null,
      description ? h("p", { className: "post-summary" }, description) : null,
      h("div", { className: "post-body" }, props.widgetFor("body"))
    );
  }));

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("zh-TW", {
        year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Taipei"
      }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function h() {
    return window.h.apply(null, arguments);
  }

  function createClass(render) {
    return window.createClass({ render: function () { return render(this.props); } });
  }
})();
