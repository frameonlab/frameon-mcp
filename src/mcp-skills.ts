/**
 * MCP Bloco C — as SKILLS: habilidade entregue como texto, não como execução.
 *
 * 🔴 A DECISÃO DE PRODUTO QUE DEFINE ESTE ARQUIVO: skill não executa, skill é
 * texto. O cliente já paga um modelo; rodar um segundo modelo do nosso lado
 * pra fazer o que o dele faria é conta dobrada sem ganho nenhum pra ele.
 *
 * Ou seja: skill aqui NÃO chama modelo nenhum. Ela é um roteiro — quais tools
 * chamar, em que ordem, o que olhar no resultado e o que entregar no fim. Quem
 * raciocina é o modelo do cliente, com o token do cliente. O custo interno
 * desta feature inteira é o de servir uma string. Se algum dia alguém pensar em
 * "executar" uma skill no nosso lado, é outra feature, com outra conta de luz,
 * e precisa da autorização que esta não precisou.
 *
 * POR QUE EM CÓDIGO E NÃO EM SEED: mesma razão do `mcp-guide.ts` — a skill
 * nomeia tools, e tools são código. Semear no banco criaria uma segunda fonte
 * que envelhece calada: alguém tira uma tool da allowlist e a skill segue
 * mandando chamá-la, sem nada no diff pra denunciar. Aqui, o `SKILL_TOOLS_USED`
 * abaixo é conferido por teste contra a allowlist real.
 *
 * DUAS PORTAS, DE PROPÓSITO:
 *  - `prompts/list` + `prompts/get` — vira `/frameon:analyze_project` no Claude
 *    Code. É a porta do humano.
 *  - as tools `list_skills` / `get_skill` — porque MUITO cliente MCP não lê
 *    prompt nenhum; agente autônomo tipicamente só enxerga tools. Sem a segunda
 *    porta, a skill fica invisível justo para quem trabalha sozinho, que é
 *    quem mais precisa do roteiro.
 *
 * ⚠️ REGRA DURA PARA SKILL QUE ESCREVE: nunca instruir "pergunte primeiro"
 * como se a pergunta fosse uma chamada de tool — quem pergunta é o modelo do
 * cliente, na conversa dele, ANTES de chamar. O texto manda PROPOR e esperar o
 * ok. É o que o `plan_epic` já faz no guide, e casa com o guard
 * anti-alucinação do lado interno, que joga fora turno sem tool call.
 */

import type { GuidePromptSpec } from "./mcp-guide";

export interface McpSkill {
  /** Identificador estável. Vira `/frameon:<name>` no cliente. */
  name: string;
  title: string;
  /** Uma linha. É o que aparece no `list_skills` e no `prompts/list`. */
  summary: string;
  /**
   * Tools que o roteiro manda chamar. Serve ao modelo (ele sabe de antemão se
   * tem tudo em mãos) e serve ao teste, que confere contra a allowlist real —
   * skill apontando pra tool que não existe é a forma mais irritante de
   * quebrar: o roteiro parece certo e morre na terceira linha.
   */
  tools: string[];
  arguments: Array<{ name: string; description: string; required: boolean }>;
  /** Recebe os argumentos já normalizados (string vazia quando ausente). */
  render: (args: Record<string, string>) => string;
}

/** Argumento que quase toda skill aceita e nenhuma exige. */
const PROJECT_ARG = {
  name: "project_id",
  description:
    "Project id, if you already know it. Leave empty and the first tool call will list the projects you can reach.",
  required: false,
};

/** Abertura comum: sem projeto resolvido, todo roteiro trabalha no escuro. */
const resolveProjectStep = (projectId: string) =>
  projectId
    ? `Work in project ${projectId}.`
    : `First settle which project this is: call \`list_tasks\` with no \`project_id\`
and the error lists every project you can reach, each with the repository it
governs. Match your working directory against that. If exactly one matches, use
it and say which. If none or several do, show the candidates and ask — do not
pick for the person.`;

export const MCP_SKILLS: McpSkill[] = [
  {
    name: "analyze_project",
    title: "Diagnose a project's health and risks",
    summary:
      "Read the project's memory, structure, stats and open alerts, and give an evidence-backed read on where it stands and what is at risk.",
    tools: [
      "get_project_memory",
      "get_project_structure",
      "get_task_stats",
      "list_tasks",
      "get_project_alerts",
    ],
    arguments: [PROJECT_ARG],
    render: (a) => `Diagnose this FrameOn project for me.

${resolveProjectStep(a.project_id)}

1. \`get_project_memory\` — the decisions, conventions and traps the team
   already recorded. Start here: a risk the team already knows about and
   accepted is not a finding, and reporting it as one wastes everyone's time.
2. \`get_project_structure\` and \`get_task_stats\` — the shape of the work and
   the numbers behind it.
3. \`get_project_alerts\` — what the workspace flagged on its own: overdue work,
   deadlines about to slip, tasks with no owner, people overloaded. These were
   computed from the data, not from an impression.
4. \`list_tasks\` on what the alerts point at, when you need the detail to say
   something specific instead of something vague.

Then give me, in this order and no longer than it needs to be:

- **Where it stands** — what is done, in flight, and not started, with numbers.
- **What is at risk** — each item with the evidence that produced it (the
  alert, the date, the task). A risk without evidence is an opinion; say so
  explicitly if you are offering one.
- **What I should do next** — at most three things, most consequential first.

Two honesty rules. An empty alert list can mean "nothing you are allowed to
see", not always "nothing wrong" — say which you believe and why. And if the
memory is empty, say that too: a project with no recorded decisions is itself
a finding worth naming.

Do not change anything in this skill. It reads only.`,
  },
  {
    name: "period_report",
    title: "Report what happened in a period",
    summary:
      "Produce a period report: what moved, what stalled, where the hours went, and what is queued next.",
    tools: [
      "list_tasks",
      "get_task_stats",
      "get_time_report",
      "get_project_memory",
    ],
    arguments: [
      PROJECT_ARG,
      {
        name: "period",
        description:
          'The window to report on, in plain words: "last week", "the last 30 days", "this sprint".',
        required: false,
      },
    ],
    render: (a) => `Write me a status report on this FrameOn project${
      a.period ? ` for ${a.period}` : " for the period I will name next"
    }.

${resolveProjectStep(a.project_id)}

1. \`get_task_stats\` and \`list_tasks\` — what changed state, what is in flight,
   and what is overdue.
2. \`get_time_report\` with the period in days — where the hours actually went,
   by person and by task.
3. \`get_project_memory\` only if you need context for something that looks odd;
   do not paste it into the report.

Then write the report in four short blocks:

- **Delivered** — what closed, with the task keys.
- **In flight** — what is moving and what it is waiting on.
- **Stalled** — what did not move and, where you can tell, why. This is the
  block people skip and the one that is worth reading.
- **Next** — what the current state says comes next. Not a wish list.

🔴 On the numbers: report them as they came back. A KPI that arrives null is
missing, NOT zero — "no hours recorded" and "zero hours worked" are different
claims and only one of them is safe to make. Financial figures may be stripped
out entirely depending on what this token's role may see; if they are absent,
say the report is the hours view, do not reconstruct money from a rate you
assumed.

Do not change anything in this skill. It reads only.`,
  },
  {
    name: "plan_scope",
    title: "Break an outcome into tasks",
    summary:
      "Turn a goal into a proposed breakdown — checking what already exists first — and create it only after the person approves.",
    tools: [
      "get_project_memory",
      "get_project_structure",
      "list_tasks",
      "create_task",
    ],
    arguments: [
      PROJECT_ARG,
      {
        name: "goal",
        description: "What needs to be accomplished.",
        required: false,
      },
    ],
    render: (a) => `Plan this work in FrameOn${
      a.goal ? `: ${a.goal}` : " (I will describe the goal next)"
    }.

${resolveProjectStep(a.project_id)}

1. \`get_project_memory\` and \`get_project_structure\` — what conventions this
   team follows and what already exists. Half of "new scope" turns out to be
   an epic someone opened three months ago.
2. \`list_tasks\` on anything that looks like an overlap. Duplicated scope is
   more expensive to unwind than to avoid.
3. **Propose the breakdown to me in the chat, and stop.** Titles, the parent
   you would hang each one on, and one line of why the split falls where it
   does. Do not create anything yet.
4. Only after I say go, call \`create_task\` for each item, parents before
   children so you have the parent id to pass.

On hierarchy: epic > story > task > subtask is this workspace's recommendation
and nothing more. Any type can parent any other, and a subtask can have
children. Suggest the conventional shape, never enforce it, and if I ask for
something else, do it my way without arguing the point twice.

If the goal is too vague to break down, say what you would need to know instead
of inventing a plausible-looking tree. A confident breakdown of a goal nobody
agreed on is the most expensive thing you can produce here.`,
  },
  {
    name: "log_my_hours",
    title: "Log the hours from this session",
    summary:
      "Turn what was actually done in this session into time entries on the right tasks — yours only, and pending a human's approval.",
    tools: ["list_tasks", "log_time", "add_comment"],
    arguments: [
      PROJECT_ARG,
      {
        name: "work_date",
        description:
          "The day the work happened, YYYY-MM-DD. Leave empty for today.",
        required: false,
      },
    ],
    render: (a) => `Log the hours I worked in this session into FrameOn.

${resolveProjectStep(a.project_id)}

1. Look back over what we actually did in this session and group it by subject.
   Estimate honestly: rounding four hours up to eight is not a rounding error,
   it is an invoice.
2. \`list_tasks\` to find the task each block of work belongs to. If nothing
   fits, say so — do not park the hours on a loosely related task because it
   was the closest match.
3. **Show me the list before writing it**: task, hours, and one line of what
   the time was spent on. Wait for my ok.
4. Then \`log_time\` for each${a.work_date ? ` with \`work_date: "${a.work_date}"\`` : ""},
   with a description that will still mean something in six months.
5. Optionally \`add_comment\` on the task with what was done, when the substance
   is worth more than the number.

What this tool will not do, and you should not promise otherwise: the entry is
always yours — the person who owns this token — because there is no field for
anyone else's id. It always lands unapproved; a human submits and approves it
in the web app. And it is refused when the task is already done, when the date
is far in the past or in the future, or when that timesheet period was already
closed. 🔴 If you get a refusal, tell me what it said. Never retry with a
shifted date to slip past it.`,
  },
  {
    name: "project_memory",
    title: "Inherit and hand over the project's memory",
    summary:
      "Open a session by loading what the team already knows, and close it by writing back what you learned — so the next developer starts where you stopped.",
    tools: [
      "get_project_memory",
      "save_classified_memory",
      "search_documents",
      "get_document_full_content",
      "create_wiki_page",
    ],
    arguments: [
      PROJECT_ARG,
      {
        name: "phase",
        description:
          'Which half you want: "open" to load the memory at the start, "close" to write back at the end. Empty means open.',
        required: false,
      },
    ],
    render: (a) => {
      // `?? ""` e não `a.phase.` direto: `render` é público e o cliente de
      // prompt normaliza, mas um chamador que passe `{}` cru não deveria
      // derrubar a skill inteira por causa de um argumento opcional.
      const closing = (a.phase ?? "").toLowerCase().startsWith("clos");
      return `${
        closing
          ? "Hand over what I learned in this session to the project's shared memory."
          : "Load this project's shared memory before we start."
      }

${resolveProjectStep(a.project_id)}

This is the thing that makes FrameOn more than a task list: the notes that
would otherwise live in one developer's local file live here, where the next
person — or the next agent, on another machine — will actually find them.

${
  closing
    ? `1. Go back over the session and pick out what the next person would want and
   could not reconstruct cheaply: a decision and its reasoning, a convention
   that is not visible in the code, a trap that cost you time, a constraint
   someone stated.
2. Skip what the commit history already says. "Renamed the service" is not
   memory, it is a diff.
3. **Show me the list before writing it**, one line each, and wait for my ok.
4. Then \`save_classified_memory\` for each one. Write it as a full sentence
   with its reason attached — "we use X" is half a memory; "we use X because Y
   failed under Z" is the one worth keeping.
5. When the reasoning is long enough that a sentence would lose it, write a
   Wiki page with \`create_wiki_page\` instead, and save a short memory pointing
   at it. Search with \`search_documents\` first so you are adding to the record
   rather than restating it.

The Wiki through this connector is append-only: never rewrite someone else's
page. To correct one, write a new page that references the old one — a wrong
page that is visible gets fixed, an overwritten one is just gone.`
    : `1. \`get_project_memory\` — one call returns the decisions and conventions on
   record, the Wiki pages that exist, the risks currently open and the work in
   flight. It is handed to you raw, not summarised by anyone.
2. Read it yourself and keep what bears on what we are about to do. Do not
   paste it back at me — I can already read it. Tell me instead what in there
   changes how we should proceed.
3. Follow up on what matters: \`search_documents\` for a subject, then
   \`get_document_full_content\` on the page that answers it. Pulling every page
   because they were listed is how a cheap call becomes an expensive one.
4. Then say plainly what the memory does NOT cover about our task. That gap is
   what we are about to fill, and naming it is more useful than a summary.

Two things it will not contain: anything marked confidential — withheld on
purpose, and the briefing says how many were — and anything nobody wrote down.
An empty memory is not a clean project, it is an unrecorded one.`
}`;
    },
  },
];

/**
 * Tools citadas por qualquer skill. O teste confere isto contra a allowlist do
 * `mcp-tools.service.ts` — roteiro que manda chamar tool inexistente quebra na
 * terceira linha, com cara de erro do cliente.
 */
export const SKILL_TOOLS_USED: string[] = Array.from(
  new Set(MCP_SKILLS.flatMap((s) => s.tools)),
).sort();

/**
 * As skills servidas também por `prompts/list`, no mesmo formato dos prompts do
 * guide. Derivado, não duplicado: o texto continua tendo uma fonte só.
 */
export const SKILL_PROMPTS: GuidePromptSpec[] = MCP_SKILLS.map((skill) => ({
  name: skill.name,
  title: skill.title,
  description: skill.summary,
  arguments: skill.arguments,
  render: skill.render,
}));

/** O índice devolvido por `list_skills`. Barato de propósito: nomes e uma linha. */
export function listSkills(): {
  skills: Array<{
    name: string;
    title: string;
    summary: string;
    tools: string[];
  }>;
  how_to_use: string;
} {
  return {
    skills: MCP_SKILLS.map(({ name, title, summary, tools }) => ({
      name,
      title,
      summary,
      tools,
    })),
    how_to_use:
      "Call get_skill with the name to get the full script: which tools to call, " +
      "in what order, and what to deliver. The script is instructions for you to " +
      "run with your own tools — nothing executes on the FrameOn side.",
  };
}

/**
 * O roteiro completo de uma skill. `null` para nome desconhecido — quem
 * transforma isso em resposta legível é o handler, que aproveita para listar os
 * nomes válidos em vez de deixar o modelo adivinhar.
 */
export function getSkill(
  name: string,
  args?: Record<string, unknown>,
): {
  name: string;
  title: string;
  summary: string;
  tools: string[];
  instructions: string;
} | null {
  const skill = MCP_SKILLS.find((s) => s.name === name);
  if (!skill) return null;

  // Mesma normalização do `McpPromptsService`: cada `render` ramifica em
  // truthiness, e `undefined` interpolado escreveria a palavra "undefined" no
  // meio do roteiro.
  const normalized: Record<string, string> = {};
  for (const arg of skill.arguments) {
    const raw = args?.[arg.name];
    normalized[arg.name] = typeof raw === "string" ? raw.trim() : "";
  }

  return {
    name: skill.name,
    title: skill.title,
    summary: skill.summary,
    tools: skill.tools,
    instructions: skill.render(normalized),
  };
}
