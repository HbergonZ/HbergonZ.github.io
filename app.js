const htmlInput = document.getElementById("htmlInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const includeEvidence = document.getElementById("includeEvidence");
const inputPanel = document.getElementById("inputPanel");
const newHtmlBtn = document.getElementById("newHtmlBtn");

const dashboard = document.getElementById("dashboard");
const summaryCards = document.getElementById("summaryCards");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const dimensionList = document.getElementById("dimensionList");
const pendingList = document.getElementById("pendingList");

const extractAnswer = (card) => {
  const answerBox = [...card.querySelectorAll("div")].find((el) =>
    (el.textContent || "").includes("Resposta:"),
  );

  if (!answerBox) return "";

  const raw = (answerBox.textContent || "")
    .replace(/\s+/g, " ")
    .replace("Resposta:", "")
    .trim();

  return raw;
};

const isAnswered = (answer) => {
  if (!answer) return false;
  const normalized = answer.trim();
  return normalized !== "-";
};

const evidenceStatus = (card) => {
  const evidenceBadge = [...card.querySelectorAll("div")].find((el) =>
    /Evidências/i.test(el.textContent || ""),
  );

  if (!evidenceBadge) return "unknown";

  const style = (evidenceBadge.getAttribute("style") || "").toLowerCase();
  if (style.includes("255, 0, 0") || style.includes("#ff0000")) return "red";
  if (style.includes("24, 232, 0") || style.includes("#18e800")) return "green";

  return "unknown";
};

const parseQuestions = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const dimensions = [...doc.querySelectorAll(".mb-6")]
    .map((dim) => {
      const title =
        dim.querySelector("h3")?.textContent?.trim() || "Sem dimensão";
      const cards = [...dim.querySelectorAll("div.border.rounded-lg.p-3")];

      const questions = cards.map((card) => {
        const question =
          card.querySelector("div.font-bold.text-black")?.textContent?.trim() ||
          "Pergunta sem título";
        const answer = extractAnswer(card);
        const answered = isAnswered(answer);
        const evidence = evidenceStatus(card);

        return { question, answer, answered, evidence };
      });

      return { title, questions };
    })
    .filter((d) => d.questions.length > 0);

  return dimensions;
};

const buildSummary = (stats) => {
  summaryCards.innerHTML = `
    <article class="card">
      <span class="label">Total de perguntas</span>
      <strong class="value">${stats.total}</strong>
    </article>
    <article class="card">
      <span class="label">Respondidas</span>
      <strong class="value success">${stats.completed}</strong>
    </article>
    <article class="card">
      <span class="label">Pendentes</span>
      <strong class="value danger">${stats.pending}</strong>
    </article>
    <article class="card">
      <span class="label">Evidência em vermelho</span>
      <strong class="value ${stats.evidenceRed > 0 ? "danger" : "success"}">${stats.evidenceRed}</strong>
    </article>
  `;
};

const renderDimensions = (dimensions, useEvidence) => {
  dimensionList.innerHTML = "";

  dimensions.forEach((dim) => {
    const total = dim.questions.length;
    const completed = dim.questions.filter((q) =>
      useEvidence ? q.answered && q.evidence !== "red" : q.answered,
    ).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    const item = document.createElement("div");
    item.className = "dimension-item";
    item.innerHTML = `
      <div class="dimension-top">
        <strong>${dim.title}</strong>
        <span>${completed}/${total} (${percent}%)</span>
      </div>
      <div class="mini-bar"><span style="width:${percent}%"></span></div>
    `;

    dimensionList.appendChild(item);
  });
};

const renderPending = (dimensions, useEvidence) => {
  pendingList.innerHTML = "";

  const grouped = [];

  dimensions.forEach((dim) => {
    const dimPending = [];

    dim.questions.forEach((q) => {
      if (!q.answered) {
        dimPending.push(`${q.question} (sem resposta)`);
        return;
      }

      if (useEvidence && q.evidence === "red") {
        dimPending.push(`${q.question} (evidência em vermelho)`);
      }
    });

    if (dimPending.length > 0) {
      grouped.push({ title: dim.title, items: dimPending });
    }
  });

  if (grouped.length === 0) {
    pendingList.innerHTML =
      '<div class="muted">Nenhuma pendência encontrada 🎉</div>';
    return;
  }

  grouped.forEach((group) => {
    const details = document.createElement("details");
    details.className = "accordion-item";
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = `${group.title} (${group.items.length})`;

    const ul = document.createElement("ul");
    ul.className = "accordion-content";

    group.items.forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      ul.appendChild(li);
    });

    details.appendChild(summary);
    details.appendChild(ul);
    pendingList.appendChild(details);
  });
};

const analyze = () => {
  const source = htmlInput.value.trim();
  if (!source) {
    alert("Cole o HTML da página para gerar o monitoramento.");
    return;
  }

  const dimensions = parseQuestions(source);
  if (dimensions.length === 0) {
    alert(
      "Não encontrei perguntas no HTML informado. Verifique se colou o conteúdo completo.",
    );
    return;
  }

  const useEvidence = includeEvidence.checked;
  const questions = dimensions.flatMap((d) => d.questions);

  const total = questions.length;
  const completed = questions.filter((q) =>
    useEvidence ? q.answered && q.evidence !== "red" : q.answered,
  ).length;
  const pending = total - completed;
  const evidenceRed = questions.filter((q) => q.evidence === "red").length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  buildSummary({ total, completed, pending, evidenceRed });
  renderDimensions(dimensions, useEvidence);
  renderPending(dimensions, useEvidence);

  progressText.textContent = `${percent}% (${completed}/${total})`;
  progressFill.style.width = `${percent}%`;
  dashboard.classList.remove("hidden");
  inputPanel.classList.add("hidden");
};

analyzeBtn.addEventListener("click", analyze);
includeEvidence.addEventListener("change", () => {
  if (!dashboard.classList.contains("hidden")) analyze();
});

clearBtn.addEventListener("click", () => {
  htmlInput.value = "";
  includeEvidence.checked = false;
  dashboard.classList.add("hidden");
  summaryCards.innerHTML = "";
  dimensionList.innerHTML = "";
  pendingList.innerHTML = "";
  progressText.textContent = "0%";
  progressFill.style.width = "0%";
});

newHtmlBtn.addEventListener("click", () => {
  dashboard.classList.add("hidden");
  inputPanel.classList.remove("hidden");
  htmlInput.focus();
});
