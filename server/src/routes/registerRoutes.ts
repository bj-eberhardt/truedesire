import type { Express, RequestHandler } from "express";
import { authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { routes, type RouteDefinition } from "./routeDefinitions.js";

function routeMiddleware(route: RouteDefinition): RequestHandler[] {
  return [
    ...(route.auth === "required" ? [authenticate] : []),
    ...(route.schemas ? [validateRequest(route.schemas)] : []),
    route.handler
  ];
}

export function registerRoutes(app: Express) {
  for (const route of routes) {
    app[route.method](route.path, ...routeMiddleware(route));
  }
}
