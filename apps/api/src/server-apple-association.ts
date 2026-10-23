import type { OtterApp } from "./server-http.js";

export function appleAssociation(appId: string | undefined) {
  if (
    !appId ||
    appId.trim() !== appId ||
    !/^[A-Z0-9]{10}\.[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)+$/.test(appId)
  ) {
    return undefined;
  }
  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: [{ "/": "/share/*" }, { "/": "/device" }, { "/": "/" }],
        },
      ],
    },
    webcredentials: { apps: [appId] },
  };
}

export function registerAppleAssociationRoutes(
  app: OtterApp,
  appId: () => string | undefined = () => process.env.IOS_APP_ID,
): void {
  app.get("/.well-known/apple-app-site-association", (context) => {
    const association = appleAssociation(appId());
    if (!association) {
      context.header("Cache-Control", "no-store");
      return context.json(
        { error: "Apple app association is not configured" },
        404,
      );
    }
    context.header("Cache-Control", "public, max-age=3600");
    return context.json(association);
  });
}
