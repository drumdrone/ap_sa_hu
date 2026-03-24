"use client"

/**
 * Displays a banner when the app is running in a non-production environment.
 * Controlled by the NEXT_PUBLIC_ENVIRONMENT env variable.
 */
type EnvironmentBannerProps = {
  deploymentMismatch?: {
    env: string
    deployment: string
  } | null
}

export function EnvironmentBanner({ deploymentMismatch = null }: EnvironmentBannerProps) {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || "unknown"

  if (env === "production" && !deploymentMismatch) {
    return null
  }

  return (
    <>
      {env !== "production" && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            backgroundColor: "#f59e0b",
            color: "#000",
            textAlign: "center",
            padding: "6px 10px",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            borderRadius: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {env} prostředí — změny zde neovlivní produkci
        </div>
      )}

      {deploymentMismatch && (
        <div
          style={{
            position: "fixed",
            bottom: env !== "production" ? 56 : 16,
            right: 16,
            zIndex: 10000,
            backgroundColor: "#dc2626",
            color: "#fff",
            textAlign: "left",
            padding: "8px 10px",
            fontSize: "12px",
            fontWeight: 700,
            borderRadius: 10,
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            maxWidth: 360,
          }}
        >
          MISMATCH: prostředí {deploymentMismatch.env} běží na {deploymentMismatch.deployment}
        </div>
      )}
    </>
  )
}
