/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:
    process.env.NODE_ENV === "development"
      ? `.next-dev-${process.pid}`
      : ".next",
};

module.exports = nextConfig;
