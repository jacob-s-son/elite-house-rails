EliteHouse::Application.routes.draw do
 scope '(:locale)', :locale => /lv|ru/ do
   resources :categories, :only => [ :index ] do
     resources :sub_categories, :only => [ :index, :show ]
   end
   
   resources :sub_categories, :only => [ :index ] do
     resources :furniture, :only => [ :index, :show ]
   end
   
   scope 'admin' do
     resources :categories, :sub_categories, :furniture, :only => [ :new, :update, :destroy, :edit ]
   end
 end
end
