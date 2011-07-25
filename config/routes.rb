EliteHouse::Application.routes.draw do
 scope '(:locale)', :locale => /lv|ru/ do
   resources :categories, :sub_categories, :furniture_pieces
 end
end
