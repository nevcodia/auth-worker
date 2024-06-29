import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({mode}) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [react()],
		base: env.VITE_PUBLIC_URL || '/',
		server: {
			port: parseInt(env.VITE_PORT, 10) || 5173, // Default to 3000 if VITE_PORT is not defined
			host: true, // Set this to true to allow Vite to be accessed externally (required for Traefik)
		},
		optimizeDeps: {
			exclude: ['auth-worker'],
		},
	}
});
