import { defaultWranglerConfig } from "../config/config";
import { validatePagesConfig } from "../config/validation-pages";
import type { Config } from "../config";

describe("validatePagesConfig()", () => {
	describe("`main` field validation", () => {
		it("should error if configuration contains both `pages_build_output_dir` and `main` config fields", () => {
			const config = generateConfigurationWithDefaults();
			config.pages_build_output_dir = "./public";
			config.main = "./src/index.js";
			config.name = "pages-project";

			const diagnostics = validatePagesConfig(config, [], "pages-project");
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Configuration file cannot contain both both \\"main\\" and \\"pages_build_output_dir\\" configuration keys.
			    Please use \\"main\\" if you are deploying a Worker, or \\"pages_build_output_dir\\" if you are deploying a Pages project.
			  - Configuration file for Pages projects does not support \\"main\\""
		`);
		});
	});

	describe("`name` field validation", () => {
		it('should error if "name" field is not specififed at the top-level', () => {
			const config = generateConfigurationWithDefaults();
			config.pages_build_output_dir = "./public";

			const diagnostics = validatePagesConfig(config, [], undefined);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Missing top-level field \\"name\\" in configuration file.
			    Pages requires the name of your project to be configured at the top-level of your \`wrangler.toml\` file. This is because, in Pages, environments target the same project."
		`);
		});
	});

	describe("named environments validation", () => {
		it("should pass if no named environments are defined", () => {
			const config = generateConfigurationWithDefaults();
			config.pages_build_output_dir = "./public";
			config.name = "pages-project";

			const diagnostics = validatePagesConfig(config, [], "pages-project");
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeFalsy();
		});

		it("should pass for environments named 'preview' and/or 'production'", () => {
			const config = generateConfigurationWithDefaults();
			config.pages_build_output_dir = "./public";
			config.name = "pages-project";

			let diagnostics = validatePagesConfig(
				config,
				["preview"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeFalsy();

			diagnostics = validatePagesConfig(
				config,
				["production"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeFalsy();

			diagnostics = validatePagesConfig(
				config,
				["preview", "production"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeFalsy();
		});

		it("should error for any other named environments", () => {
			const config = generateConfigurationWithDefaults();
			config.pages_build_output_dir = "./assets";
			config.name = "pages-project";

			let diagnostics = validatePagesConfig(
				config,
				["unsupported-env-name-1", "unsupported-env-name-2"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Configuration file contains the following environment names that are not supported by Pages projects:
			    \\"unsupported-env-name-1\\",\\"unsupported-env-name-2\\".
			    The supported named-environments for Pages are \\"preview\\" and \\"production\\"."
		`);

			diagnostics = validatePagesConfig(
				config,
				["production", "unsupported-env-name"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Configuration file contains the following environment names that are not supported by Pages projects:
			    \\"unsupported-env-name\\".
			    The supported named-environments for Pages are \\"preview\\" and \\"production\\"."
		`);
		});
	});

	describe("unsupported fields validation", () => {
		it("should pass if configuration contains only Pages-supported configuration fields", () => {
			let config = generateConfigurationWithDefaults();
			config.pages_build_output_dir = "./dist";
			config.name = "pages-project";

			let diagnostics = validatePagesConfig(
				config,
				["preview"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeFalsy();

			config = {
				...config,
				...{
					compatibility_date: "2024-01-01",
					compatibility_flags: ["FLAG1", "FLAG2"],
					send_metrics: true,
					limits: { cpu_ms: 100 },
					placement: { mode: "smart" },
					vars: { FOO: "foo" },
					durable_objects: {
						bindings: [
							{ name: "TEST_DO_BINDING", class_name: "TEST_DO_CLASS" },
						],
					},
					kv_namespaces: [{ binding: "TEST_KV_BINDING", id: "1" }],
					queues: {
						producers: [{ binding: "TEST_QUEUE_BINDING", queue: "test-queue" }],
					},
					r2_buckets: [
						{ binding: "TEST_R2_BINDING", bucket_name: "test-bucket" },
					],
					d1_databases: [
						{
							binding: "TEST_D1_BINDING",
							database_id: "111",
							database_name: "test-db",
						},
					],
					vectorize: [
						{ binding: "VECTORIZE_TEST_BINDING", index_name: "test-index" },
					],
					hyperdrive: [{ binding: "HYPERDRIVE_TEST_BINDING", id: "222" }],
					services: [
						{ binding: "TEST_SERVICE_BINDING", service: "test-worker" },
					],
					analytics_engine_datasets: [
						{ binding: "TEST_AED_BINDING", dataset: "test-dataset" },
					],
					ai: { binding: "TEST_AI_BINDING" },
					dev: {
						ip: "127.0.0.0",
						port: 1234,
						inspector_port: 5678,
						local_protocol: "https",
						upstream_protocol: "https",
						host: "test-host",
					},
				},
			};

			diagnostics = validatePagesConfig(
				config,
				["production"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeFalsy();
		});

		it("should fail if configuration contains any fields that are not supported by Pages projects", () => {
			const defaultConfig = generateConfigurationWithDefaults();
			defaultConfig.pages_build_output_dir = "./public";
			defaultConfig.name = "pages-project";

			// test with top-level only config fields
			let config: Config = {
				...defaultConfig,
				...{
					wasm_modules: {
						MODULE_1: "testModule.mjs",
					},
					text_blobs: {
						BLOB_2: "readme.md",
					},
				},
			};
			let diagnostics = validatePagesConfig(
				config,
				["preview"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Configuration file for Pages projects does not support \\"wasm_modules\\"
			  - Configuration file for Pages projects does not support \\"text_blobs\\""
		`);

			// test with inheritable environment config fields
			config = {
				...defaultConfig,
				...{
					triggers: { crons: ["cron1", "cron2"] },
					usage_model: "bundled",
					build: {
						command: "npm run build",
					},
					node_compat: true,
				},
			};
			diagnostics = validatePagesConfig(
				config,
				["production"],
				"pages-project"
			);
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Configuration file for Pages projects does not support \\"triggers\\"
			  - Configuration file for Pages projects does not support \\"usage_model\\"
			  - Configuration file for Pages projects does not support \\"build\\"
			  - Configuration file for Pages projects does not support \\"node_compat\\""
		`);

			// test with non-inheritable environment config fields
			// (incl. `queues.consumers`)
			config = {
				...defaultConfig,
				...{
					queues: {
						producers: [
							{ queue: "test-producer", binding: "QUEUE_TEST_BINDING" },
						],
						consumers: [{ queue: "test-consumer" }],
					},
					cloudchamber: { vcpu: 100, memory: "2GB" },
				},
			};
			diagnostics = validatePagesConfig(config, ["preview"], "pages-project");
			expect(diagnostics.hasWarnings()).toBeFalsy();
			expect(diagnostics.hasErrors()).toBeTruthy();
			expect(diagnostics.renderErrors()).toMatchInlineSnapshot(`
			"Running configuration file validation for Pages:
			  - Configuration file for Pages projects does not support \\"queues.consumers\\"
			  - Configuration file for Pages projects does not support \\"cloudchamber\\""
		`);
		});
	});
});

function generateConfigurationWithDefaults() {
	return { ...defaultWranglerConfig };
}
