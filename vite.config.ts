import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
    // В режиме разработки используем React
    if (command === 'serve') {
        return {
            plugins: [react()],
            server: { watch: { include: ['dist/*', 'src/*'] } }
        };
    }

    // В режиме сборки сохраняем библиотечный режим
    return {
        build: {
            lib: {
                entry: resolve(__dirname, 'src/index.ts'),
                name: 'Gantt',
                fileName: 'frappe-gantt',
            },
            rollupOptions: {
                output: {
                    format: 'cjs',
                    assetFileNames: 'frappe-gantt[extname]',
                    entryFileNames: 'frappe-gantt.[format].js'
                },
            },
        },
        output: { interop: 'auto' },
        server: { watch: { include: ['dist/*', 'src/*'] } }
    };
});