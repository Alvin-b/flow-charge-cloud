import HomeSkeleton from "@/components/HomeSkeleton";
import { useHomeData } from "@/components/home/HomeDataProvider";
import { useTheme, ColorTheme } from "@/components/ThemeProvider";
import HomeCyberpunk from "@/components/home/HomeCyberpunk";
import HomeOcean from "@/components/home/HomeOcean";
import HomeMinimal from "@/components/home/HomeMinimal";
import HomeSunset from "@/components/home/HomeSunset";
import HomeForest from "@/components/home/HomeForest";
import HomeLavender from "@/components/home/HomeLavender";

const themeLayoutMap: Record<ColorTheme, React.ComponentType<{ data: any }>> = {
  cyberpunk: HomeCyberpunk,
  ocean: HomeOcean,
  sunset: HomeSunset,
  forest: HomeForest,
  minimal: HomeMinimal,
  lavender: HomeLavender,
};

const Home = () => {
  const { loading, data } = useHomeData();
  const { colorTheme } = useTheme();

  if (loading) return <HomeSkeleton />;

  const Layout = themeLayoutMap[colorTheme] || HomeCyberpunk;
  return <Layout data={data} />;
};

export default Home;
