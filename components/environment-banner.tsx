"use client"

/**
 * Displays a banner when the app is running in a non-production environment.
 * Controlled by the NEXT_PUBLIC_ENVIRONMENT env variable.
 */
export function EnvironmentBanner() {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT

  if (!env || env === "production") {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#f59e0b",
        color: "#000",
        textAlign: "center",
        padding: "4px 0",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {env} prostředí — změny zde neovlivní produkci
    </div>
  )
}
