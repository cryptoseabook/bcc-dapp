pragma solidity ^0.4.18;

import "./Owned.sol";
import "./BCCToken.sol";

contract BCCRoomBooking is Owned {
  // Custom types
  struct Room {
    uint id;
    address owner;
    address bookingPerson;
    string name;
    string description;
    string size;
    uint price;
  }

  // State variables
  mapping(uint => Room) public rooms;
  uint roomCounter;

  // Events
  event openRoomBookingEvent (
    uint indexed _id,
    address indexed _owner,
    string _name,
    string _description,
    string _size,
    uint256 _price
  );
  event bookingRoomEvent (
    uint indexed _id,
    address indexed _owner,
    address indexed _bookingPerson,
    string _name,
    string _description,
    string _size,
    uint256 _price
  );

  // Open Room Booking
  function openRoomBooking(string _name, string _description, string _size, uint256 _price) onlyOwner public {
    // a new article
    roomCounter++;

    // store this article
    rooms[roomCounter] = Room(
         roomCounter,
         owner,
         0x0,
         _name,
         _description,
         _size,
         _price
    );

    // trigger the event
    openRoomBookingEvent(roomCounter, owner, _name, _description, _size, _price);
  }

  // fetch the number of articles in the contract
  function getNumberOfRooms() public constant returns (uint) {
    return roomCounter;
  }

  // fetch and returns all article IDs available for sale
  function getRoomsForBooking() public constant returns (uint[]) {
    // we check whether there is at least one article
    if(roomCounter == 0) {
      return new uint[](0);
    }

    // prepare intermediary array
    uint[] memory roomIds = new uint[](roomCounter);

    uint numberOfRoomsForBooking = 0;
    // iterate over rooms
    for (uint i = 1; i <= roomCounter; i++) {
      // keep only the ID of rooms not booked yet
      //if (rooms[i].bookingPerson == 0x0) {
        roomIds[numberOfRoomsForBooking] = rooms[i].id;
        numberOfRoomsForBooking++;
      //}
    }

    // copy the articleIds array into the smaller forSale array
    uint[] memory forBooking = new uint[](numberOfRoomsForBooking);
    for (uint j = 0; j < numberOfRoomsForBooking; j++) {
      forBooking[j] = roomIds[j];
    }
    return (forBooking);
  }

  // book an room
  function bookRoom(uint _id, uint price, address bccTokenAddr) payable public {
    // we check whether there is at least one room
    require(roomCounter > 0);

    // we check whether the room exists
    require(_id > 0 && _id <= roomCounter);

    // we retrieve the room
    Room storage room = rooms[_id];

    // we check whether the room has not already been sold
    require(room.bookingPerson == 0x0);

    // we don't allow the owner to buy his/her own room
    require(room.owner != msg.sender);

    // we check whether the value sent corresponds to the room price
    require(room.price == price);

    // keep bookingPerson's information
    room.bookingPerson = msg.sender;

    // the bookingPerson can book the room
    BCCToken bccToken = BCCToken(bccTokenAddr);
    bccToken.transferMoney(room.owner, price, msg.sender);

    // trigger the event
    bookingRoomEvent(_id, room.owner, room.bookingPerson, room.name, room.description, room.size, room.price);
  }

  // kill the smart contract
  function kill() onlyOwner public {
    selfdestruct(owner);
  }

  function getOwner() public constant returns (address) {
      return owner;
  }
}
