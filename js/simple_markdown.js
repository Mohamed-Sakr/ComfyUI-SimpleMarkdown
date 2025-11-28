import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "SimpleMarkdown.Preview",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SimpleMarkdownPreview") {
            
            function setupWidget(node) {
                if (node.widgets && node.widgets.find(w => w.name === "markdown_display")) {
                    return;
                }

                const div = document.createElement("div");
                div.id = "markdown_content_" + node.id;
                
                Object.assign(div.style, {
                    color: "#e0e0e0",
                    padding: "12px",
                    width: "100%",
                    height: "100%",
                    minHeight: "200px",
                    overflowY: "auto",
                    whiteSpace: "normal",
                    fontFamily: "Consolas, monospace",
                    fontSize: "14px",
                    backgroundColor: "#1e1e1e",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    boxSizing: "border-box",
                    lineHeight: "1.5"
                });
                div.innerText = "Ready. Waiting for output...";

                const widget = node.addDOMWidget("markdown_display", "div", div, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                widget.computeSize = function(width) {
                    return [width, 220];
                };
                
                node.onResize = function(size) {
                    if (size[1] > 220) {
                        div.style.height = (size[1] - 40) + "px";
                    }
                };
            }

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                onNodeCreated?.apply(this, arguments);
                setupWidget(this);
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function() {
                onConfigure?.apply(this, arguments);
                setTimeout(() => setupWidget(this), 50);
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                onExecuted?.apply(this, arguments);
                
                if (!message || !message.text) return;
                
                const text = message.text[0];
                const widget = this.widgets?.find(w => w.name === "markdown_display");
                
                if (widget) {
                    const div = widget.element;
                    
                    function normalizeIndentation(code) {
                        const lines = code.split('\n');
                        let minIndent = Infinity;
                        for (const line of lines) {
                            if (line.trim().length > 0) {
                                const indent = line.match(/^\s*/)[0].length;
                                minIndent = Math.min(minIndent, indent);
                            }
                        }
                        if (minIndent > 0 && minIndent !== Infinity) {
                            return lines.map(line => line.substring(minIndent)).join('\n');
                        }
                        return code;
                    }
                    
                    let codeBlocks = [];
                    let textWithPlaceholders = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                        code = normalizeIndentation(code);
                        
                        let coloredCode = code;
                        
                        coloredCode = coloredCode.replace(/(".*?"|'.*?')/g, "Â§STRÂ§$1Â§/STRÂ§");
                        coloredCode = coloredCode.replace(/(#.*$)/gm, "Â§COMÂ§$1Â§/COMÂ§");
                        coloredCode = coloredCode.replace(/\b(def|class|import|from|return|print|if|else|elif|for|while|try|except|with|as)\b/g, "Â§KEYÂ§$1Â§/KEYÂ§");
                        coloredCode = coloredCode.replace(/\b(\d+)\b/g, "Â§NUMÂ§$1Â§/NUMÂ§");
                        
                        coloredCode = coloredCode
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;");
                        
                        coloredCode = coloredCode
                            .replace(/Â§STRÂ§/g, '<span class="s-str">')
                            .replace(/Â§\/STRÂ§/g, '</span>')
                            .replace(/Â§COMÂ§/g, '<span class="s-com">')
                            .replace(/Â§\/COMÂ§/g, '</span>')
                            .replace(/Â§KEYÂ§/g, '<span class="s-key">')
                            .replace(/Â§\/KEYÂ§/g, '</span>')
                            .replace(/Â§NUMÂ§/g, '<span class="s-num">')
                            .replace(/Â§\/NUMÂ§/g, '</span>');
                        
                        let placeholder = `___CODEBLOCK${codeBlocks.length}___`;
                        codeBlocks.push({lang, coloredCode});
                        return placeholder;
                    });
                    
                    let html = textWithPlaceholders
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

                    html = html
                        .replace(/&lt;div style="color: ([^"]+);"&gt;/g, '<div style="color: $1;">')
                        .replace(/&lt;\/div&gt;/g, "</div>");

                    html = html.replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5em; font-weight: bold; margin-top: 10px; border-bottom: 1px solid #444;">$1</h1>');
                    html = html.replace(/^## (.*$)/gm, '<h2 style="font-size: 1.3em; font-weight: bold; margin-top: 10px;">$1</h2>');
                    html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
                    html = html.replace(/^\s*-\s+(.*)/gm, '<div style="margin-left: 20px;">â€¢ $1</div>');
                    html = html.replace(/`([^`]+)`/g, '<span style="background: #333; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</span>');

                    html = html.replace(/\n\n/g, '<br><br>');
                    html = html.replace(/\n/g, '<br>');

                    codeBlocks.forEach((block, i) => {
                        const codeBlockHtml = `<pre style="background:#2b2b2b; padding:12px; border-radius:6px; border:1px solid #444; margin:10px 0; overflow-x:auto; font-family:Consolas, monospace; box-shadow:0 2px 6px rgba(0,0,0,0.4); white-space:pre;"><code class="language-${block.lang || "text"}">${block.coloredCode}</code></pre>`;
                        html = html.replace(`___CODEBLOCK${i}___`, codeBlockHtml);
                    });

                    const styleBlock = `
                        <style>
                            .s-str { color: #a8ff60; }
                            .s-com { color: #888; }
                            .s-key { color: #ff79c6; }
                            .s-num { color: #bd93f9; }
                        </style>
                    `;

                    div.innerHTML = styleBlock + html;
                    div.scrollTop = div.scrollHeight;
                    
                    app.graph.setDirtyCanvas(true, true);
                }
            };
        }
    }
});
