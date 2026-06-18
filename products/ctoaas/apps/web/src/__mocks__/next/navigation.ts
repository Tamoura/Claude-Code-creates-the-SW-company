const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

export const useRouter = () => ({
  push: mockPush,
  replace: mockReplace,
  back: mockBack,
  prefetch: jest.fn(),
});

export const useParams = () => ({});
export const useSearchParams = () => new URLSearchParams();
export const usePathname = () => "/";
