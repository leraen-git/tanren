import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useDietGenerationStore } from '@/stores/dietGenerationStore'
import { useToastStore } from '@/stores/toastStore'
import { trpc } from '@/lib/trpc'
import { useInvalidateDiet } from '@/lib/invalidation'
import i18n from '@/i18n'

export function DietGenerationWatcher() {
  const { status, payload, finish, fail } = useDietGenerationStore()
  const toast = useToastStore()
  const invalidateDiet = useInvalidateDiet()
  const running = useRef(false)
  const utils = trpc.useUtils()

  const submitMutation = trpc.diet.submitIntakeV2.useMutation()
  const regenMutation = trpc.diet.regeneratePlanV2.useMutation()

  useEffect(() => {
    if (status !== 'generating' || !payload || running.current) return
    running.current = true

    const run = async () => {
      try {
        const locale = (i18n.language?.startsWith('fr') ? 'fr' : 'en') as 'fr' | 'en'
        if (payload.mode === 'submit' && payload.submitInput) {
          await submitMutation.mutateAsync({ ...payload.submitInput, locale } as any)
        } else if (payload.mode === 'regenerate') {
          await regenMutation.mutateAsync({ useNewIntake: false, locale })
        }
        invalidateDiet()
        finish()
        toast.show(i18n.t('diet.genReadyToast'), 'success', {
          duration: 5000,
          onPress: () => router.push('/diet'),
        })
      } catch (err: any) {
        // The server may have completed the generation even though the client
        // lost the response (Android backgrounding, Railway proxy timeout, etc.).
        // Check if the plan actually exists before declaring failure.
        try {
          const plan = await utils.diet.getMyPlanV2.fetch()
          if (plan) {
            invalidateDiet()
            finish()
            toast.show(i18n.t('diet.genReadyToast'), 'success', {
              duration: 5000,
              onPress: () => router.push('/diet'),
            })
            return
          }
        } catch {}

        const raw = err?.message ?? ''
        const msg = raw.includes('{') || raw.length > 100
          ? i18n.t('diet.genErrorToast')
          : raw || i18n.t('diet.genErrorToast')
        fail(msg)
        toast.show(msg, 'error', { duration: 5000 })
      } finally {
        running.current = false
      }
    }

    run()
  }, [status, payload])

  return null
}
