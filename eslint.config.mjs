import next from "eslint-config-next";

export default [...next, { ignores: [".next/**", "node_modules/**", "src/components/preloader-source.ts"] }];
