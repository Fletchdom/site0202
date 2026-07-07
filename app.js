const params = new URLSearchParams(location.search);
const page = document.body.dataset.page;
const fallbackTdk = {
  title: "在线观看日本电影 - 高清日本电影免费在线观看",
  keywords: "在线观看日本电影,日本电影免费观看,高清日本电影,日本电影在线,日本电影推荐,日本电影大全,日本电影网站",
  description: "免费在线观看高清日本电影，提供最新日本电影、经典日本电影、日本动画电影在线观看，每日更新日本电影资源，支持手机电脑在线播放。"
};

let items = [];

function applyTdk(entry = fallbackTdk) {
  document.title = entry.title;
  document.querySelector("meta[name='keywords']")?.setAttribute("content", entry.keywords);
  document.querySelector("meta[name='description']")?.setAttribute("content", entry.description);
}

function parseTdkLine(line) {
  const parts = line.split("----").map((part) => part.trim());
  if (parts.length < 3 || parts[0] === "标题") return null;
  return { title: parts[0], keywords: parts[1], description: parts.slice(2).join("----") };
}

async function applyTdkFromFile() {
  try {
    const text = await fetch("./tdk.txt", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("tdk not found");
      return response.text();
    });
    const entries = text.split(/\r?\n/).map(parseTdkLine).filter(Boolean);
    const selected = entries.find((entry) => entry.title.includes("在线观看日本电影") && entry.keywords.includes("日本电影网站"))
      || entries.find((entry) => entry.keywords.includes("日本电影在线"))
      || entries[0];
    applyTdk(selected || fallbackTdk);
  } catch {
    applyTdk(fallbackTdk);
  }
}

async function loadItems() {
  items = await fetch("./items.json", { cache: "no-store" }).then((response) => response.json());
}

function card(item) {
  return `<article class="card">
    <a href="./movie.html?id=${encodeURIComponent(item.id)}">
      <div class="cover">
        <img src="${item.poster}" alt="${item.title}" loading="lazy">
        <span>${item.status || item.kind}</span>
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <p>${item.originalTitle}</p>
        <div class="meta"><b>${item.score}</b><span>${item.year}</span><span>${item.kind}</span></div>
      </div>
    </a>
  </article>`;
}

function row(item) {
  return `<a class="broadcast-row" href="./movie.html?id=${encodeURIComponent(item.id)}">
    <img src="${item.poster}" alt="${item.title}" loading="lazy">
    <span>
      <b>${item.title}</b>
      <small>${item.kind} / ${item.genre} / ${item.year} / ${item.score}</small>
    </span>
  </a>`;
}

function renderHome() {
  const hot = [...items].sort((a, b) => b.hot - a.hot);
  const lead = hot[0];
  document.getElementById("heroScreen").innerHTML = `<a href="./movie.html?id=${lead.id}">
    <img src="${lead.poster}" alt="${lead.title}">
    <span><small>${lead.status || "热播"} / ${lead.kind}</small><b>${lead.title}</b></span>
  </a>`;
  document.getElementById("onAirList").innerHTML = hot.slice(1, 6).map(row).join("");
  document.getElementById("spotlight").innerHTML = hot.slice(6, 14).map(row).join("");
  document.getElementById("rankList").innerHTML = [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => `<li><a href="./movie.html?id=${item.id}"><b>${item.title}</b><span>${item.score}</span></a></li>`)
    .join("");
  document.getElementById("homeGrid").innerHTML = hot.slice(0, 36).map(card).join("");
}

function filteredItems() {
  const kind = params.get("kind") || "全部";
  const sort = params.get("sort") || document.getElementById("sortSelect")?.value || "hot";
  let list = [...items];
  if (kind !== "全部") list = list.filter((item) => item.kind === kind);
  list.sort((a, b) => sort === "score" ? b.score - a.score : sort === "year" ? b.year - a.year : b.hot - a.hot);
  return { list, kind };
}

function renderLibrary() {
  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.onclick = () => {
      const value = button.dataset.kind;
      location.href = value === "全部" ? "./library.html" : `./library.html?kind=${encodeURIComponent(value)}`;
    };
  });

  const sortSelect = document.getElementById("sortSelect");
  sortSelect.value = params.get("sort") || "hot";
  sortSelect.onchange = () => {
    params.set("sort", sortSelect.value);
    location.href = `./library.html?${params.toString()}`;
  };

  const { list, kind } = filteredItems();
  document.getElementById("libraryTitle").textContent = kind === "全部" ? "全部内容" : `${kind}频道`;
  document.getElementById("resultCount").textContent = `${list.length} 条`;
  document.getElementById("libraryGrid").innerHTML = list.map(card).join("");
}

function renderDetail() {
  const item = items.find((entry) => entry.id === params.get("id")) || items[0];
  applyTdk(fallbackTdk);
  document.getElementById("detailRoot").innerHTML = `
    <div class="detail-poster"><img src="${item.poster}" alt="${item.title}"></div>
    <div class="detail-copy">
      <p class="eyebrow">${item.status || "高清"} / ${item.kind}</p>
      <h1>${item.title}</h1>
      <p class="origin">${item.originalTitle}</p>
      <div class="detail-meta"><span>评分 ${item.score}</span><span>${item.year}</span><span>${item.genre}</span><span>${item.kind}</span></div>
      <p>${item.summary}</p>
      <a class="btn primary" href="./library.html?kind=${encodeURIComponent(item.kind)}">查看同类内容</a>
    </div>`;
  const related = items.filter((entry) => entry.id !== item.id && (entry.kind === item.kind || entry.genre === item.genre)).slice(0, 8);
  document.getElementById("relatedGrid").innerHTML = related.map(card).join("");
}

async function boot() {
  applyTdk(fallbackTdk);
  await Promise.all([loadItems(), applyTdkFromFile()]);
  if (page === "home") renderHome();
  if (page === "library") renderLibrary();
  if (page === "detail") renderDetail();
}

boot();
