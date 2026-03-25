/** OpenAPI 3.0 document for Strategy Vault HTTP API (Route Handlers). */

export function buildOpenApiSpec(origin: string): Record<string, unknown> {
  const base = origin.replace(/\/$/, "");

  return {
    openapi: "3.0.3",
    info: {
      title: "Strategy Vault API",
      description:
        "HTTP endpoints exposed by the Next.js app. Mutations (create/update/delete) are primarily via Server Actions in the UI. Data is stored in Supabase (Postgres + Storage). Authenticated routes use the Supabase session cookie from Google sign-in; in Swagger **Try it out**, requests run in the browser with `credentials` so the session is sent.",
      version: "1.0.0",
    },
    servers: [{ url: base, description: "Current host" }],
    tags: [
      { name: "System", description: "Health and metadata" },
      { name: "Strategies", description: "Read-only strategy listing" },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          description: "Public. Used by load balancers and uptime checks.",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/api/openapi": {
        get: {
          tags: ["System"],
          summary: "OpenAPI document",
          description: "Public. Machine-readable API description (this spec).",
          responses: {
            "200": {
              description: "OpenAPI JSON",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/v1/strategies": {
        get: {
          tags: ["Strategies"],
          summary: "List my strategies",
          description:
            "Requires an authenticated Supabase session (cookie). Returns strategies owned by the current user with embedded `strategy_metrics`.",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "string" },
              description: "Filter by name (case-insensitive contains)",
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["idea", "research", "testing", "live", "archived"],
              },
              description: "Filter by status",
            },
          ],
          responses: {
            "200": {
              description: "List of strategies",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/StrategyListResponse" },
                },
              },
            },
            "401": {
              description: "Not signed in",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "500": {
              description: "Server or database error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/strategies/{id}": {
        get: {
          tags: ["Strategies"],
          summary: "Get one strategy",
          description:
            "Requires session cookie. Returns 404 if missing or not owned by the user.",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Strategy with metrics",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/StrategyOneResponse" },
                },
              },
            },
            "401": {
              description: "Not signed in",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sb-auth",
          description:
            "Supabase session cookies (actual names include your project ref, e.g. sb-<ref>-auth-token). Sign in via the web app; Swagger “Try it out” sends same-origin cookies when credentials are enabled.",
        },
      },
      schemas: {
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            service: { type: "string", example: "strategy-vault" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        StrategyMetrics: {
          type: "object",
          nullable: true,
          properties: {
            id: { type: "string", format: "uuid" },
            strategy_id: { type: "string", format: "uuid" },
            win_rate: { type: "number", nullable: true },
            total_trades: { type: "integer", nullable: true },
            winning_trades: { type: "integer", nullable: true },
            losing_trades: { type: "integer", nullable: true },
            net_profit: { type: "number", nullable: true },
            max_drawdown: { type: "number", nullable: true },
            profit_factor: { type: "number", nullable: true },
            average_trade: { type: "number", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Strategy: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            owner_id: { type: "string", format: "uuid", nullable: true },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            status: { type: "string" },
            market: { type: "string", nullable: true },
            instrument: { type: "string", nullable: true },
            timeframe: { type: "string", nullable: true },
            session: { type: "string", nullable: true },
            direction: { type: "string", nullable: true },
            concept: { type: "string", nullable: true },
            notes: { type: "string", nullable: true },
            installation_guide: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            strategy_metrics: {
              oneOf: [
                { $ref: "#/components/schemas/StrategyMetrics" },
                {
                  type: "array",
                  items: { $ref: "#/components/schemas/StrategyMetrics" },
                },
              ],
            },
          },
        },
        StrategyListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Strategy" },
            },
          },
        },
        StrategyOneResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/Strategy" },
          },
        },
      },
    },
  };
}
