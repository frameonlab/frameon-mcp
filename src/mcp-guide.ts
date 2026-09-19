/**
 * MCP Onda 5 — o GUIA que viaja junto com a conexão.
 *
 * Conectar um LLM ao FrameOn dá ao agente vinte ferramentas e nenhuma
 * noção do que fazer com elas. Ele não sabe que hierarquia de task aqui é
 * livre, não sabe que a Wiki é onde a equipe guarda memória, e trata cada
 * sessão como se fosse a primeira. O resultado é task solta sem épico,
 * decisão que morre no chat e "em qual projeto mesmo?" a cada turno.
 *
 * Este arquivo é a correção: doutrina em texto, entregue por `resources/read`
 * e resumida no `instructions` do handshake.
 *
 * POR QUE EM CÓDIGO E NÃO EM SEED DE BANCO: o guia descreve o que as tools
 * FAZEM, e as tools são código. Semear no banco criaria uma segunda fonte de
 * verdade que envelhece calada — exatamente o defeito que a frente "ajuda
 * única gerada do código" existe pra matar. Aqui, mexer na allowlist e
 * esquecer o guia deixa os dois lado a lado no mesmo diff.
 *
 * ⚠️ O `instructions` do handshake entra no contexto do cliente em TODO turno.
 * Ele é resumo, não manual: o manual mora no resource, que o agente lê quando
 * quiser. Inflar o resumo é imposto cobrado em cada mensagem do usuário.
 */

/** Resumo curto do handshake. Todo caractere daqui é pago em todo turno. */
export const GUIDE_HEADLINE =
  "FrameOn is the team's shared project memory, not just a task list. " +
  "Tasks record what is being done; the Wiki records what was learned and " +
  "decided. Read the frameon://guide resource before your first write.";

/**
 * O guia completo, servido em `frameon://guide`.
 *
 * Escrito em inglês de propósito: é consumido por modelo, não por humano, e o
 * cliente MCP não passa locale nenhum no handshake. As strings que o USUÁRIO
 * lê continuam nos cinco locales, na UI — este texto nunca aparece numa tela.
 */
export const GUIDE_MARKDOWN = `# Working inside FrameOn

FrameOn is a multi-tenant project management platform. Through MCP you are
acting **as a specific person, inside one workspace**. Everything you can see
or change is already narrowed to that person's access — you never need to
filter by tenant, and you cannot reach another one.

## 1. Know where you are before you write

Every tool call is scoped to a project. Call \`list_tasks\` with no
\`project_id\` and the error payload hands you \`available_projects\`: each
entry carries the project id, its client, and the **repository** it governs.

That repository field is the bridge between the code you are editing and the
project that tracks it. When the working directory matches a project's
repository, that is the project — do not ask, and do not guess a different
one. When nothing matches, ask the person which project this belongs to
rather than picking the first in the list.

That field is optional and plenty of workspaces leave it empty. If none of
the projects you can reach declares a repository, there is nothing to match
against — ask, and it is worth telling the person once that filling **Code
repository** in the project settings is what makes an assistant find the
right project on its own.

## 2. Hierarchy is free — organise by epic anyway

Any task type can parent any other. There is **no** rule that a subtask must
be a leaf; a subtask can have children. The platform will not stop you from
creating a flat pile of tasks, which is exactly why the discipline has to come
from you:

- Group related work under an **epic**. One epic per coherent outcome.
- Put the executable units under it as tasks, and only break a task into
  subtasks when someone would genuinely pick them up separately.
- Before creating a task, call \`get_project_structure\` and look for the epic
  it belongs under. A new top-level task is a decision, not a default.

All of that is a **recommendation**, not a constraint. epic > story > task >
subtask is the shape most teams settle on, and teams here do break it on
purpose. Suggest the convention, never enforce it: when the person asks for
something that does not follow it, do what they asked. An unusual hierarchy in
an existing project is a choice someone made, not an error for you to fix.

## 3. The Wiki is the team's memory — use it

\`create_wiki_page\` is not documentation busywork. It is how a decision made
in your session survives into everyone else's. Write a page when:

- a decision was made and the reasoning would be expensive to reconstruct;
- something failed and the next person would repeat it;
- a convention was established that is not visible in the code;
- a piece of work closed and the "why" is worth more than the diff.

Do **not** write a page for something the commit history already says.

The Wiki is a tree, and a page created without a parent lands at the root. Before
creating one, call \`list_documents_brief\` and read the \`parent_id\` of what is
already there: if a page covers the area, pass its id as
\`create_wiki_page.parent_id\`. The root is where a genuinely new area belongs —
it is not the default for everything else.

The Wiki through MCP is **append-only**: you create pages, you never rewrite
someone else's. A page created in the wrong place is visible and removable in
one click; a page silently overwritten is gone with no trace. When you need to
correct an earlier page, create a new one that references it.

## 4. Comments carry the narrative

\`add_comment\` on a task is the running log of that task. Progress, blockers,
and what you actually did belong there — not in a Wiki page, and not lost in
the chat. A task whose comments explain its history is a task the next person
can pick up cold.

## 5. What FrameOn does — including the parts you cannot reach

Your tools cover one slice of the platform. Knowing the rest matters, because
the useful answer to "can FrameOn do X?" is often "yes, in the web app" — and
a person who is told "I have no tool for that" walks away believing the
product cannot do it.

**Through these tools you can:** read and create tasks at any level of the
hierarchy, update status, priority, dates, assignee, story points and labels,
comment on tasks, read the project structure and its statistics, search the
Wiki and project documents semantically, read a page in full, create new Wiki
pages, list the project team, read the project's open risk alerts, read the
hours and delivery report for a period, log **your own** hours against a task,
read and write the project's shared memory, and report external AI usage back
for cost tracking.

**The shared memory is the point of this connector.** \`get_project_memory\`
gives you, in one call, what a returning colleague would need: the decisions
and conventions the team recorded, the Wiki pages that exist, the open risk
alerts and the work in flight. Call it when you arrive in a project you do not
know, instead of reconstructing it from the task list. \`save_classified_memory\`
is the other half: when something is decided or learned, write it there and
the next person — or the next agent, on another machine — starts from it. This
is what replaces a memory file that lives on one developer's laptop.

**You do not have to work out the sequence yourself.** \`list_skills\` names the
routines this workspace already knows — diagnosing a project, reporting on a
period, breaking scope into tasks, logging your hours, inheriting and handing
over the memory — and \`get_skill\` returns the script for one: which tools, in
what order, what to look at, what to deliver. They are instructions for *you*,
carried out with your own tools; nothing runs on the FrameOn side, and asking
for one costs nothing but the text. They also encode the traps that are cheap
to avoid and expensive to hit twice, so reading the relevant one before a
first attempt is usually faster than a second attempt.

**FrameOn also has, and you do not:** a Gantt with dependencies and baselines;
a Kanban board; the weekly timesheet screen where hours are reviewed and
approved — you can log your own, never approve anyone's, not even your own;
the full financial reports with rates, margins and billing (what you get is
the hours-and-delivery slice of them, and the financial figures are stripped
out entirely unless this token's role may see them); an AI cost control centre
broken down by project and person; imports from MS Project and Excel; two-way
Jira sync; an internal AI agent with its own chat, which unlike you has the
full toolset and a human watching; a proactive nudge engine that emails
people about work going stale; an automatic weekly Wiki digest written
by that agent; plans, add-ons and billing; white-label branding per tenant.

When the person needs one of those, say where it lives in FrameOn and let them
do it there. Do not improvise a replacement out of task comments — a Gantt
rebuilt as a comment is worse than a pointer to the real one. Some of these
are paid add-ons and may be switched off for this tenant; if they say they
cannot find a screen you mentioned, that is the likely reason, and it is an
account question rather than something for you to work around.

## 6. What you deliberately cannot do

Anything destructive or wide-reaching is absent from your tool list on
purpose, because there is no human reviewing your calls the way there is in
the FrameOn chat: no deleting, no bulk operations, no creating projects, no
approving timesheets — yours or anyone else's — no rewriting Wiki pages, and
no deleting or re-ranking memories that someone else recorded. If a tool you
expect is missing, that is either the deliberate exclusion above, a token
without the write scope, or a role that does not carry the permission — not a
bug to route around.

The same logic shapes what the write tools you *do* have will accept. Hours
are always logged for the person who owns this token and always arrive
pending a human's approval; there is no field for whose hours they are,
because hours become cost and cost becomes an invoice. Memory you write
carries your name on it. None of this is a restriction to work around by
asking a person to grant you more — it is what makes it safe for you to write
at all.

## 7. Working rhythm

At the start of a working session: identify the project (repository match),
then \`get_project_memory\` to inherit what the team already knows, and
\`get_project_structure\` or \`list_tasks\` to see the current state.

While working: keep the task you are advancing updated with
\`update_task\`, and log the substance in \`add_comment\`.

At the end: if anything was decided or learned, record it —
\`save_classified_memory\` for a decision, a convention or a trap worth a
sentence; a Wiki page when the reasoning is long enough that a sentence would
lose it. If the work was only executed, the task and its comments are enough.
If you burned hours on it, \`log_time\` against the task while you still
remember what they were spent on.
`;

/**
 * Briefing de UMA vez por sessão, anexado à primeira `tools/call`.
 *
 * O problema que ele resolve: o guia completo só chega por `resources/read`, e
 * cliente MCP não lê resource sozinho — `subscribe:false`, nenhum push. Na
 * prática o agente trabalhava a sessão inteira sem nunca ver a doutrina, e o
 * `instructions` do handshake é curto demais pra carregá-la (todo caractere
 * dali é pago em TODO turno).
 *
 * Por isso aqui: a primeira chamada de tool é o momento em que o agente já
 * decidiu agir e ainda não errou. Uma vez por sessão, não por turno — o custo
 * é uma dose única, não um imposto.
 *
 * ⚠️ Cabe em ~25 linhas de propósito. O que não couber vai pro resource; este
 * texto existe pra dar ao agente motivo de abrir o resource, não pra
 * substituí-lo. A leva 2 gastou três linhas a mais aqui porque memória
 * compartilhada e hora lançada são justamente o que o agente faz ERRADO sem
 * ler nada: ele reconstrói o projeto do zero a cada sessão, e tentaria lançar
 * hora de outra pessoa. Bullet que só descreve tool não paga o próprio custo.
 */
export const SESSION_BRIEFING = `--- FrameOn: how to work here (sent once per session) ---

FrameOn is the team's shared memory, not just a task list. What you write here
is what the next person — or the next agent — will find. Read the full guide at
the \`frameon://guide\` resource; this is the short version.

- **Scope:** every call needs a \`project_id\`. Omit it once and the error lists
  the projects you can reach, each with the repository it governs. Match your
  working directory against that repository instead of guessing.
- **Hierarchy is free.** Any task type can parent any other; a subtask can have
  children. epic > story > task > subtask is a recommendation — suggest it,
  never enforce it, and follow what the person asks for.
- **There are ready-made routines.** \`list_skills\` names them and \`get_skill\`
  gives you the script — diagnose a project, report a period, plan scope, log
  hours, inherit the memory. Instructions for you to run; nothing executes on
  our side.
- **Start by inheriting, not by guessing.** \`get_project_memory\` returns the
  decisions, Wiki pages, open risks and work in flight in one call;
  \`save_classified_memory\` is how what you learned reaches the next person
  without anyone copying a file between machines.
- **The Wiki is memory, and it is append-only here.** Write a page when a
  decision or a failure would be expensive to reconstruct; never rewrite
  someone else's page — create a new one that references it.
- **Comments carry the narrative.** Progress and blockers go in
  \`add_comment\`, written for whoever picks the task up cold.
- **Hours are yours only.** \`log_time\` books against whoever owns this token
  and always lands pending approval — never retry a refusal with a new date.
- **Your tools are a slice of the product.** Gantt, Kanban, imports, Jira sync,
  billing and timesheet approval live in the FrameOn web app and are not in
  your hands. Point the person there instead of improvising a replacement.

--- end of briefing; the tool result follows in the block above ---`;

/**
 * Prompts guiados (`prompts/list`). São o atalho do usuário pra rotina que o
 * guia descreve: quem digita `/frameon:record_decision` não precisa ter lido o
 * documento inteiro pra fazer a coisa certa.
 *
 * `arguments` é sempre opcional. Cliente MCP que exige preencher argumento
 * antes de rodar transforma atalho em formulário, e aí ninguém usa.
 */
export interface GuidePromptSpec {
  name: string;
  title: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
  /** Recebe os argumentos já normalizados (string vazia quando ausente). */
  render: (args: Record<string, string>) => string;
}

export const GUIDE_PROMPTS: GuidePromptSpec[] = [
  {
    name: "start_session",
    title: "Start work on a FrameOn project",
    description:
      "Identify which project this repository belongs to and load its current state before doing anything else.",
    arguments: [
      {
        name: "repository",
        description:
          "Repository URL or name of the code you are working on. Leave empty to be shown every project you can access.",
        required: false,
      },
    ],
    render: (a) => `Figure out which FrameOn project I am working in${
      a.repository ? `, for the repository ${a.repository}` : ""
    }.

1. Call list_tasks with no project_id to get available_projects.
2. Match on the repository field${
      a.repository ? "" : " against my current working directory"
    }. If exactly one project matches, use it and say which one. If none or
   several match, show me the candidates and ask — do not pick for me.
3. Once the project is settled, call get_project_structure and give me a short
   read on where things stand: open epics, what is in progress, anything
   overdue.

Do not create or change anything in this step.`,
  },
  {
    name: "plan_epic",
    title: "Break an outcome into an epic",
    description:
      "Turn a goal into one epic plus the tasks under it, checking first whether an epic already covers it.",
    arguments: [
      {
        name: "goal",
        description: "What needs to be accomplished.",
        required: false,
      },
      {
        name: "project_id",
        description: "Project id, if you already know it.",
        required: false,
      },
    ],
    render: (a) => `Plan this work in FrameOn as an epic${
      a.goal ? `: ${a.goal}` : " (I will describe the goal next)"
    }.

${
  a.project_id
    ? `Project: ${a.project_id}.`
    : "First settle which project this belongs to — see available_projects."
}

1. Call get_project_structure and check whether an epic already covers this.
   Extending an existing epic beats inventing a parallel one.
2. Propose the breakdown to me BEFORE creating anything: the epic, the tasks
   under it, and what you deliberately left out.
3. Only after I agree, create them with create_task, parenting each task to
   the epic.`,
  },
  {
    name: "record_decision",
    title: "Record a decision in the project Wiki",
    description:
      "Write what was decided and why into the Wiki, so it survives past this conversation.",
    arguments: [
      {
        name: "topic",
        description: "What the decision was about.",
        required: false,
      },
      {
        name: "project_id",
        description: "Project id, if you already know it.",
        required: false,
      },
    ],
    render: (a) => `Record ${
      a.topic ? `the decision about ${a.topic}` : "what we decided"
    } in the FrameOn Wiki.

${
  a.project_id
    ? `Project: ${a.project_id}.`
    : "Settle the project first — match the repository if you can."
}

Write a page covering: what was decided, what the alternatives were, why this
one won, and what would have to change for us to revisit it. Skip anything the
commit history already states.

Search first with search_documents — if a page already covers this, create a
new page that references it rather than restating it. The Wiki through MCP is
append-only; you never overwrite someone else's page.

Show me the page content before you create it.`,
  },
  {
    name: "log_progress",
    title: "Log what was actually done",
    description:
      "Update the task you advanced and leave the substance in a comment.",
    arguments: [
      {
        name: "task_id",
        description: "Task id, if you already know it.",
        required: false,
      },
    ],
    render: (a) => `Log the work we just did in FrameOn.

${
  a.task_id
    ? `Task: ${a.task_id}.`
    : "Find the task this belongs to first — list_tasks on the current project, and ask me if it is ambiguous."
}

1. add_comment with what actually happened: what changed, what broke, what is
   still open. Write it for someone picking this up cold next week, not as a
   summary of our chat.
2. update_task only if the status genuinely moved. Do not mark something done
   that is not done.
3. If a decision came out of this, tell me — that belongs in the Wiki, not in
   a comment.`,
  },
];
