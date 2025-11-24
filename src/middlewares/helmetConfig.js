import helmet from "helmet";
import { ENV } from "../utils/env.js";

const helmetConfig = (app) => {
  if (ENV.NODE_ENV === "production") {
    console.log("🚀 Running helmet with PRODUCTION settings");

    app.use(
      helmet({
        contentSecurityPolicy: true,
        crossOriginEmbedderPolicy: true,
        crossOriginResourcePolicy: { policy: "same-origin" },
        dnsPrefetchControl: { allow: false },
        expectCt: { enforce: true, maxAge: 30 },
        frameguard: { action: "deny" },
        hidePoweredBy: true,
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // 1 year
        ieNoOpen: true,
        noSniff: true,
        permittedCrossDomainPolicies: { policy: "none" },
        referrerPolicy: { policy: "no-referrer" },
        xssFilter: true,
      })
    );
  } else {
    console.log("🛠️ Running helmet with DEVELOPMENT settings");

    app.use(
      helmet({
        contentSecurityPolicy: false, // Allow inline scripts during development
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
        dnsPrefetchControl: false,
        expectCt: false,
        frameguard: { action: "sameorigin" }, // Allow iframe for same origin
        hidePoweredBy: false, // Not necessary for local testing
        hsts: false, // HTTPS not needed locally
        ieNoOpen: false,
        noSniff: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: "no-referrer" },
        xssFilter: true,
      })
    );
  }
};

export default helmetConfig;
