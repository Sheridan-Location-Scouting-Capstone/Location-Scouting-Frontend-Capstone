import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const alias = {
  '@': path.resolve(__dirname, './src'),
}

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        resolve: { alias },
        test : {
          name: 'unit',
          include: ['src/test/unit/**/*.test.ts'],
          environment: 'node',
          globals: true,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test : {
          name: 'integration',
            include: ['src/test/integration/**/*.test.ts'],
            environment: 'node',
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
            fileParallelism: false,
            globalSetup: ['./src/test/containers.ts'],
        },
      },
    ],
  },
})