/* eslint-disable no-param-reassign */
/**
 * @argument { import('@babel/core') }
 * @returns { import('@babel/core').PluginObj }
 * */
module.exports = ({ types } = {}) => {
  /** @argument { import('@babel/core').types.Comment[] } */
  const checkIsHtml = ([comment] = []) => comment?.type === 'CommentBlock' && comment?.value.trim() === 'html';
  const minifyHtml = (html = '') => html.trim().replace(/>\s+</g, '><').replace(/\s\s+/g, ' ');

  return {
    name: 'template-html-minifier',
    visitor: {
      TemplateLiteral({ node }) {
        if (checkIsHtml(node.leadingComments)) {
          node.leadingComments = null;
          node.quasis = node.quasis.map(quasis => {
            quasis.value.raw = minifyHtml(quasis.value.raw);
            quasis.value.cooked = minifyHtml(quasis.value.cooked);

            return quasis;
          });
        }
      },
      StringLiteral({ node }) {
        if (checkIsHtml(node.leadingComments)) {
          node.leadingComments = null;
          node.value = minifyHtml(node.value);
        }
      },
      JSXElement(path) {
        /** @type { import('@babel/core').types.TemplateLiteral } */
        const template = types.templateLiteral([types.templateElement({ raw: '' })], []);
        let string = '';

        const addStringToTemplate = () => {
          template.quasis.push(
            types.templateElement({
              raw: string,
              cooked: string,
            }),
          );
          string = '';
        };

        /** @argument { import('@babel/core').types.JSXElement } node */
        const stringifyNode = node => {
          const { openingElement, children, closingElement } = node;
          string += `<${openingElement.name.name}`;

          for (let i = 0; i < openingElement.attributes.length; i += 1) {
            const { name, value } = openingElement.attributes[i];
            string += ` ${name.name.replace(/^className$/, 'class')}="`;

            if (!types.isJSXExpressionContainer(value)) {
              string += `${value.value}"`;
            } else {
              template.expressions.push(value.expression);
              addStringToTemplate();
              string = '"';
            }
          }

          string += '>';

          for (let i = 0; i < children.length; i += 1) {
            const childNode = children[i];

            if (childNode.type === 'JSXText') {
              string += childNode.value.trim();
            } else if (childNode.type === 'JSXElement') {
              stringifyNode(childNode);
            } else if (childNode.type === 'JSXExpressionContainer') {
              template.expressions.push(childNode.expression);
              addStringToTemplate();
            }
          }

          string += `</${closingElement.name.name}>`;
        };

        stringifyNode(path.node);
        addStringToTemplate();

        template.quasis.shift();
        path.replaceWith(template);
      },
    },
  };
};
