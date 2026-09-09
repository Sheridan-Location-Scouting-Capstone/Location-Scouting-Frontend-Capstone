import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Link,
  Stack,
  Typography,
} from '@mui/material'

const featureCards = [
  {
    title: 'Scene coverage',
    description:
      'Track which scenes are fully covered, partially matched, or still missing a location.',
  },
  {
    title: 'Keyword gaps',
    description:
      'Spot the missing visual cues before production starts costing time and money.',
  },
  {
    title: 'Location mapping',
    description:
      'Compare candidate sites quickly and keep everything organized by production.',
  },
]

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) redirect('/locations')

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 6, md: 10 },
        background:
          'radial-gradient(circle at top, rgba(92, 107, 192, 0.18), transparent 35%), #F5F5F7',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={5} alignItems="center">
          <Chip
            data-testid="landing-badge"
            label="Location scouting, simplified"
            sx={{
              bgcolor: 'rgba(92, 107, 192, 0.12)',
              color: 'primary.main',
              fontWeight: 700,
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
            }}
          />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            alignItems="center"
            sx={{ width: '100%' }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.06em',
                  lineHeight: 1.04,
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  color: 'text.primary',
                  maxWidth: 620,
                }}
              >
                Find the perfect location before the set is built.
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ mt: 2, maxWidth: 560, lineHeight: 1.6 }}
              >
                Locus Point helps productions compare locations, uncover keyword gaps,
                and keep scene coverage organized in one place.
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 4, flexWrap: 'wrap' }}>
                <Button
                  data-testid="landing-sign-up-button"
                  component={Link}
                  href="/sign-up"
                  variant="contained"
                  size="large"
                >
                  Sign Up
                </Button>
                <Button
                  data-testid="landing-login-button"
                  component={Link}
                  href="/sign-in"
                  variant="outlined"
                  size="large"
                >
                  Log In
                </Button>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, width: '100%' }}>
              <Card
                sx={{
                  borderRadius: 4,
                  border: '1px solid rgba(92, 107, 192, 0.12)',
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
                  background: 'rgba(255,255,255,0.92)',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <Box
                      data-testid="landing-production-snapshot"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="overline" color="text.secondary">
                        Production snapshot
                      </Typography>
                      <Chip
                        data-testid="landing-production-live-badge"
                        label="Live"
                        size="small"
                        sx={{
                          bgcolor: '#E8F5E9',
                          color: '#2E7D32',
                          fontWeight: 700,
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 2,
                      }}
                    >
                      <Box
                        data-testid="landing-metric-scenes"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: 'rgba(92, 107, 192, 0.08)',
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Scenes
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          42
                        </Typography>
                      </Box>

                      <Box
                        data-testid="landing-metric-matches"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: 'rgba(34, 197, 94, 0.08)',
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Matches
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          18
                        </Typography>
                      </Box>

                      <Box
                        data-testid="landing-metric-gaps"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: 'rgba(251, 191, 36, 0.08)',
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Gaps
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          6
                        </Typography>
                      </Box>

                      <Box
                        data-testid="landing-metric-locked"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: 'rgba(244, 63, 94, 0.08)',
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Locked
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          9
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: 'rgba(15, 23, 42, 0.02)',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        “Urban rooftops and alley interiors are the strongest matches this week.”
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{ width: '100%' }}
          >
            {featureCards.map((feature) => (
              <Card
                key={feature.title}
                data-testid={`landing-feature-card-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                sx={{
                  flex: 1,
                  borderRadius: 3,
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
