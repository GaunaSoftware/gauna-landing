import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Gauna'),
    tags: z.array(z.string()).default([]),
    category: z.enum(['normativa', 'gestion', 'nominas', 'tecnologia']).default('normativa'),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
    // Preguntas frecuentes visibles al final del artículo y en el marcado FAQPage.
    // Las respuestas admiten enlaces internos en formato [texto](/ruta/).
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { blog };
