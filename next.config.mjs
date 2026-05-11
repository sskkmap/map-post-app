/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    outputFileTracingIncludes: {
        '/articles/*': ['./public/data-articles/**/*'],
    },
    experimental: {
    },
    serverExternalPackages: ['remark', 'remark-gfm', 'remark-rehype', 'rehype-slug', 'rehype-stringify', 'gray-matter'],
};

export default nextConfig;
