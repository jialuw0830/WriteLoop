declare module "monaco-editor-vue3" {
    import type { DefineComponent } from "vue";

    const MonacoEditor: DefineComponent<{
        value?: string;
        language?: string;
        theme?: string;
    }>;
    export default MonacoEditor;
}
