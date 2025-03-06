import { component$ } from '@builder.io/qwik';

import './app.css';
import { Button } from '@/components/ui/button';

export const App = component$(() => {

	return (
		<>
			<h1>Vite + Qwik</h1>
			<div class="card">
				<div class="flex flex-col items-center justify-center min-h-svh">
					<Button>Click me</Button>
				</div>
			</div>
			<p class="read-the-docs">Click on the Vite and Qwik logos to learn more</p>
		</>
	);
});
