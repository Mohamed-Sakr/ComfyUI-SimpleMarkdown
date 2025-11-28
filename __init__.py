import random

class SimpleMarkdownPreview:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"forceInput": True, "dynamicPrompts": False}),
            },
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "preview"
    OUTPUT_NODE = True
    CATEGORY = "utils"

    def preview(self, text):
        return {"ui": {"text": [text]}, "result": (text,)}

NODE_CLASS_MAPPINGS = {
    "SimpleMarkdownPreview": SimpleMarkdownPreview
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SimpleMarkdownPreview": "Simple Markdown Preview"
}

WEB_DIRECTORY = "./js"
