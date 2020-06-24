package fr.blosky;

import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.Bukkit;

public class Main extends JavaPlugin {

		@Override
		public void onEnable() {
		
			Bukkit.getServer().getPluginManager().registerEvents(new Event(), this);

	}

}