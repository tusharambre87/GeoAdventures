import PostHog from 'posthog-react-native'

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

// When no PostHog key is configured (e.g. dev / CI), disable the client
// entirely so it makes zero network requests and never surfaces flush errors.
export const posthog = new PostHog(key || 'disabled', {
  host: 'https://us.i.posthog.com',
  disabled: !key,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>

export const Analytics = {
  identify: (userId: string, traits?: Props) => {
    posthog.identify(userId, traits)
  },
  track: (event: string, properties?: Props) => {
    posthog.capture(event, properties as any)
  },
  screen: (name: string, properties?: Props) => {
    posthog.screen(name, properties as any)
  },
  reset: () => {
    posthog.reset()
  },
}
