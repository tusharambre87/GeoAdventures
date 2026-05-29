import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const buildUrl = (env: string) => {
    const u = new URL(`https://${hostname}/api/v2/connection`);
    u.searchParams.set('include_secrets', 'true');
    u.searchParams.set('connector_names', connectorName);
    u.searchParams.set('environment', env);
    return u.toString();
  };

  const fetchConn = async (env: string) => {
    const response = await fetch(buildUrl(env), {
      headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken }
    });
    const data = await response.json();
    return data.items?.[0];
  };

  connectionSettings = await fetchConn(targetEnvironment);

  // Fall back to development credentials if no production connection is configured yet
  if ((!connectionSettings || !connectionSettings.settings?.publishable || !connectionSettings.settings?.secret) && isProduction) {
    console.warn(`[Stripe] No production connection found — falling back to development credentials`);
    connectionSettings = await fetchConn('development');
  }

  if (!connectionSettings || (!connectionSettings.settings?.publishable || !connectionSettings.settings?.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();

  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
