/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

declare module '*.css' {
  const content: string
  export default content
}
