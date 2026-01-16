// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "Mentoss",
			social: {
				github: "https://github.com/humanwhocodes/mentoss",
			},
			editLink: {
				baseUrl:
					"https://github.com/humanwhocodes/mentoss/edit/main/docs/",
			},
			lastUpdated: true,
			sidebar: [
				{
					label: "Getting Started",
					slug: "getting-started",
				},
				{
					label: "Mock Servers",
					autogenerate: { directory: "mock-servers" },
				},
				{
					label: "Fetch Mockers",
					autogenerate: { directory: "fetch-mockers" },
				},
				{
					label: "Mock Agents",
					autogenerate: { directory: "mock-agents" },
				},
			],
			components: {
				Footer: "./src/components/MyFooter.astro",
			},
		}),
	],
});
