import PostHog from 'posthog-react-native'

export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_KEY!,
  { host: 'https://us.i.posthog.com' }
)

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
