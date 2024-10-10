import { defineDocumentType, makeSource } from "contentlayer/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

/** @type {import('contentlayer/source-files').ComputedFields} */
const computedFields: import("contentlayer/source-files").ComputedFields = {
  slug: {
    type: "string",
    resolve: (doc: any) => `/${doc._raw.flattenedPath}`,
  },
  slugAsParams: {
    type: "string",
    resolve: (doc: any) => doc._raw.flattenedPath.split("/").slice(1).join("/"),
  },
};

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `blog/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    date: {
      type: "date",
      required: true,
    },
    published: {
      type: "boolean",
      default: true,
    },
    image: {
      type: "string",
      required: true,
    },
  },
  computedFields,
}));

const setupCodeSnippet = () => (tree: any) => {
  visit(tree, (node) => {
    if (node?.type === "element" && node?.tagName === "pre") {
      const [codeEl] = node.children;
      if (codeEl.tagName !== "code") {
        return;
      }

      if (codeEl.data?.meta) {
        // Extract event from meta and pass it down the tree.
        const regex = /event="([^"]*)"/;
        const match = codeEl.data?.meta.match(regex);
        if (match) {
          node.__event__ = match ? match[1] : null;
          codeEl.data.meta = codeEl.data.meta.replace(regex, "");
        }

        const copyId = codeEl.data?.meta.match(/copyId="([^"]*)"/);
        if (copyId) {
          node.__copyId__ = copyId[1];
        }
      }

      node.__rawString__ = codeEl.children?.[0].value;
    }
  });
};

export default makeSource({
  contentDirPath: "./content",
  documentTypes: [Post],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      setupCodeSnippet,
      rehypeSlug,
      [
        rehypePrettyCode as any,
        {
          theme: "github-dark",
          onVisitLine(node: any) {
            // Prevent lines from collapsing in `display: grid` mode, and allow empty
            // lines to be copy/pasted
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
          onVisitHighlightedLine(node: any) {
            node.properties.className.push("line--highlighted");
          },
          onVisitHighlightedWord(node: any) {
            node.properties.className = ["word--highlighted"];
          },
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section",
          },
        },
      ],
    ],
  },
});
