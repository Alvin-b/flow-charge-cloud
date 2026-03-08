import HomeSkeleton from "@/components/HomeSkeleton";
import { useHomeData } from "@/components/home/HomeDataProvider";
import { useTheme, ColorTheme } from "@/components/ThemeProvider";
import HomeCyberpunk from "@/components/home/HomeCyberpunk";
import HomeOcean from "@/components/home/HomeOcean";
import HomeMinimal from "@/components/home/HomeMinimal";

const themeLayoutMap: Record<ColorTheme, React.ComponentType<{ data: any }>> = {
  cyberpunk: HomeCyberpunk,
  ocean: HomeOcean,
  sunset: HomeCyberpunk,   // TODO: phase 2
  forest: HomeOcean,       // TODO: phase 2
  minimal: HomeMinimal,
  lavender: HomeOcean,     // TODO: phase 2
};

const Home = () => {
  const { loading, data } = useHomeData();
  const { colorTheme } = useTheme();

  if (loading) return <HomeSkeleton />;

  const Layout = themeLayoutMap[colorTheme] || HomeCyberpunk;
  return <Layout data={data} />;
};

export default Home;
