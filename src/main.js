import App from './Todo.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;
