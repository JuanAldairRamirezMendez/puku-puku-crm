import { SkeletonCard, SkeletonKPI, SkeletonSearchResult, SkeletonSidebar } from '../components/Skeleton';

export default {
  title: 'Components/Skeleton',
  parameters: {
    backgrounds: { default: 'crema' },
  },
};

export const CardDefault = {
  render: () => <SkeletonCard />,
};

export const Card4Lines = {
  render: () => <SkeletonCard lines={4} height="140px" />,
};

export const KPI = {
  render: () => <SkeletonKPI />,
};

export const SearchResult = {
  render: () => <SkeletonSearchResult />,
};

export const Sidebar = {
  render: () => <SkeletonSidebar />,
};
