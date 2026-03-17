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
  )
}
