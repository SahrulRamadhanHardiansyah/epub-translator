import google.generativeai as genai
from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup, NavigableString, ProcessingInstruction, Declaration, Comment
import asyncio
import json
import os

class EpubTranslator:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})

    async def _translate_batch_async(self, texts, target_lang, style, semaphore):
        if not texts:
            return []
        
        async with semaphore:
            prompt = f"""
            You are a professional translator. Translate the following array of texts into {target_lang}.
            Style: {style}.

            IMPORTANT RULES:
            1. Return ONLY a JSON Array of strings. Example: ["Text 1", "Text 2"]
            2. The array length MUST match the input array length exactly.
            3. Do not translate proper names (Character names, Places).
            4. Preserve any special symbols.

            Input Array:
            {json.dumps(texts)}
            """
            try:
                response = await self.model.generate_content_async(prompt, request_options={'timeout': 60})
                translations = json.loads(response.text)
                
                if len(translations) != len(texts):
                    print(f"Mismatch JSON: Input {len(texts)} vs Output {len(translations)}")
                    return texts 
                return translations
            except Exception as e:
                print(f"Error Batch: {e}")
                return texts

    async def process_book_async(self, input_path, output_path, target_lang="Indonesian", style="Formal"):
        loop = asyncio.get_running_loop()
        
        # Baca EPUB
        book = await loop.run_in_executor(None, epub.read_epub, input_path)

        tasks = []
        node_map = []
        semaphore = asyncio.Semaphore(15)

        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                try:
                    content = item.get_content().decode('utf-8')
                except:
                    continue
                    
                soup = BeautifulSoup(content, 'html.parser')

                text_nodes = []
                original_texts = []

                for node in soup.find_all(string=True):
                    if isinstance(node, (ProcessingInstruction, Declaration, Comment)):
                        continue

                    if node.parent and node.parent.name in ['script', 'style', 'xml', 'code', 'pre']:
                        continue

                    if isinstance(node, NavigableString) and node.strip():
                        if "xml version=" in node or "encoding=" in node:
                            continue
                            
                        text_nodes.append(node)
                        original_texts.append(str(node).strip())

                chunk_size = 15
                for i in range(0, len(original_texts), chunk_size):
                    batch_texts = original_texts[i:i+chunk_size]
                    batch_nodes = text_nodes[i:i+chunk_size]

                    task = self._translate_batch_async(batch_texts, target_lang, style, semaphore)
                    tasks.append(task)

                    node_map.append({
                        'nodes': batch_nodes,
                        'item': item,
                        'soup': soup
                    })

        print(f"Mulai menerjemahkan {len(tasks)} batch secara paralel...")
        results = await asyncio.gather(*tasks)

        for i, translated_texts in enumerate(results):
            mapping = node_map[i]
            nodes = mapping['nodes']
            for node, new_text in zip(nodes, translated_texts):
                if new_text and new_text != node.string:
                    node.replace_with(new_text)

        processed_items = set()
        for mapping in node_map:
            item = mapping['item']
            if item not in processed_items:
                item.set_content(str(mapping['soup']).encode('utf-8'))
                processed_items.add(item)

        await loop.run_in_executor(None, epub.write_epub, output_path, book)
        return output_path