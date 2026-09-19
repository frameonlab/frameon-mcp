/**
 * Tipos do protocolo JSON-RPC 2.0 sobre Streamable HTTP.
 *
 * INTERFACES, NUNCA CLASSES COM DECORATOR: `params` é um saco aberto por
 * definição — cada tool tem o seu shape —, então validação declarativa de
 * envelope rejeitaria requisição legítima.
 *
 * A validação de verdade acontece duas vezes, onde ela cabe:
 *   1. `assertJsonRpcRequest` (forma do envelope)
 *   2. o zod da própria tool, no `invoke` (forma dos argumentos)
 */

/**
 * Versão que anunciamos quando o cliente pede uma que não conhecemos. É a que
 * o servidor de fato implementa — não mexer aqui só pra agradar um cliente
 * novo.
 */
export const MCP_PROTOCOL_VERSION = "2026-06-18";

/**
 * Versões que sabemos ecoar. É lista de COMPAT, não de implementação: para um
 * servidor stateless só-tools, as revisões diferem em superfície que não
 * usamos, então ecoar a pedida é o que mantém o cliente vivo. Divergir aqui
 * derruba cliente novo com "Server's protocol version is not supported".
 *
 * 🔴 REGRA: só entra aqui versão VISTA num handshake real, nunca chutada. Quem
 * denuncia a lista atrasada é o `warn` do `initialize` em
 * `mcp-protocol.service.ts`: se ele emite, alguém pediu uma versão ausente
 * daqui e caiu no fallback. A lista foi conferida contra o tráfego real pela
 * última vez em 2026-09-18.
 *
 * 🔴 `2026-03-26` e `2026-06-18` ficam por ora, SEM evidência a favor. São
 * inertes (ninguém as pede, então nunca são ecoadas) e a segunda é o valor de
 * `MCP_PROTOCOL_VERSION`, que é o que respondemos no fallback — mexer nela muda
 * o que anunciamos pro mundo e é decisão à parte, não limpeza.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2026-06-18",
  "2026-03-26",
];

export const JSONRPC_VERSION = "2.0";

/**
 * Códigos de erro JSON-RPC. Os -326xx são da especificação; -32000 é o
 * "server error" genérico reservado pra implementação.
 */
export const JsonRpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: string;
  id?: JsonRpcId;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcErrorBody {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcErrorBody;
}

/** Bloco de conteúdo devolvido por `tools/call`. */
export interface McpContentBlock {
  type: "text";
  text: string;
}

export interface McpToolCallResult {
  content: McpContentBlock[];
  isError?: boolean;
}

/** Item de `tools/list`. `inputSchema` é JSON Schema puro. */
export interface McpToolListItem {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

/**
 * Contexto de uma chamada — montado a partir do PAT já validado.
 * Espelha o mínimo do `SubagentContext` que as factories de tool consomem.
 *
 * `scopes`, `permissions`, `isSuperAdmin` e `roleSlug` entram porque o gate de
 * escrita se decide POR CHAMADA. Todos saem do `PatPrincipal` que o
 * `McpAuthGuard` já pôs em `request.user` — NUNCA do corpo JSON-RPC. Campo de
 * payload é forjável, e escrita decidida por dado do cliente é escalonamento de
 * privilégio de graça.
 */
export interface McpCallContext {
  tenantId: string;
  userId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Escopos do PAT. `write` ausente ⇒ nenhuma tool de mutação existe. */
  scopes: string[];
  /** Permissões do papel. Chave ausente = negado (espelha o PermissionsGuard). */
  permissions: Record<string, boolean>;
  roleSlug?: string | null;
  language?: string;
  /**
   * `credential.subject` do portador (`pat:<id>` ou `oauth:<client>:<user>`).
   * Só observabilidade — NADA de autorização decide por este campo. Existe pra
   * que a linha de log diga QUAL integração fez a chamada: `userId` sozinho não
   * distingue o PAT do Cursor do access token do Claude do mesmo humano.
   */
  subject?: string;
  /**
   * Valor do header `Mcp-Session-Id`, quando o cliente mandou um. É a sessão
   * que NÓS cunhamos no `initialize` — não a sessão do cliente. Medido em
   * 12·09: o Claude Code NÃO transporta o `session.id` dele pro servidor MCP,
   * então isto agrupa chamadas do mesmo handshake e nada além disso.
   */
  sessionId?: string | null;
  /**
   * `params._meta["claudecode/toolUseId"]` — o id da tool use do lado do
   * cliente. É a ÚNICA etiqueta que aparece dos dois lados: o mesmo valor sai
   * na telemetria do cliente como `tool_use_id`. É por ele que o gasto externo
   * amarra nesta chamada, e não por sessão (que não atravessa).
   */
  clientToolUseId?: string | null;
}

export function jsonRpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: JSONRPC_VERSION, id, result };
}

export function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    error: data === undefined ? { code, message } : { code, message, data },
  };
}

/**
 * Notificação = requisição SEM `id`. A especificação manda não responder nada
 * (o transporte HTTP devolve 202 sem corpo).
 */
export function isNotification(msg: JsonRpcRequest): boolean {
  return msg.id === undefined || msg.id === null;
}

/** Valida o envelope. Devolve a mensagem de erro, ou null se estiver ok. */
export function validateEnvelope(msg: any): string | null {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
    return "Request must be a JSON object";
  }
  if (msg.jsonrpc !== JSONRPC_VERSION) {
    return 'Field "jsonrpc" must be exactly "2.0"';
  }
  if (typeof msg.method !== "string" || msg.method.length === 0) {
    return 'Field "method" must be a non-empty string';
  }
  if (
    msg.id !== undefined &&
    msg.id !== null &&
    typeof msg.id !== "string" &&
    typeof msg.id !== "number"
  ) {
    return 'Field "id" must be a string, a number or null';
  }
  if (
    msg.params !== undefined &&
    (typeof msg.params !== "object" || msg.params === null)
  ) {
    return 'Field "params" must be an object when present';
  }
  return null;
}
